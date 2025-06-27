/**
 *
 * This module provides utility functions invoked by the worker to interact
 * with the blockchain and database for game lifecycle tasks.
 */

import { Job } from 'bullmq';
import { fetchAccount, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import {
  MastermindZkApp,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import {
  createOrUpdateGame,
  deleteManyGames,
  getPendingGames,
  updateManyGames,
} from './repositories/game.js';
import redisClient from './redisClient.js';
import { GameStatus } from './models/Game.js';

dotenv.config();

const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string;
const SERVER_PUBLIC_KEY = process.env.SERVER_PUBLIC_KEY as string;
const TRANSACTION_FEE = 1e8;

/**
 * Sends the final zk proof of a completed game to the blockchain.
 *
 * @param job - The BullMQ job containing gameId and serialized proof data.
 * @throws Will throw if transaction submission fails.
 */
export const sendFinalProof = async (job: Job) => {
  try {
    const nonce = await redisClient.incr(`${SERVER_PUBLIC_KEY}:nonce`);
    const { gameId, zkProof, winnerPublicKeyBase58 } = job.data;
    const senderPrivateKey = PrivateKey.fromBase58(SERVER_PRIVATE_KEY);
    const senderPublicKey = senderPrivateKey.toPublicKey();
    const winnerPublicKey = PublicKey.fromBase58(winnerPublicKeyBase58);
    const zkApp = new MastermindZkApp(PublicKey.fromBase58(gameId));
    console.log('creating transaction...');
    const proof = await StepProgramProof.fromJSON(JSON.parse(zkProof));
    const transaction = await Mina.transaction(
      {
        sender: senderPublicKey,
        fee: TRANSACTION_FEE,
        nonce,
      },
      async () => {
        await zkApp.submitGameProof(proof, winnerPublicKey);
      }
    );
    console.log('proving transaction...');
    await transaction.prove();
    transaction.sign([senderPrivateKey]);
    console.log('sending transaction...');
    const pendingTx = await transaction.send();
    await redisClient.incr(`${SERVER_PUBLIC_KEY}:lastNonce`);
    console.log('Transaction sent: ', pendingTx.hash);
    const txHash = pendingTx.hash;
    const game = await createOrUpdateGame({
      _id: gameId,
      settlementTransactionHash: txHash,
    });
    console.log(
      `Proof submitted for game ${gameId}, transaction hash: ${txHash}`
    );
    return game;
  } catch (err) {
    console.error(
      `Error when sending final proof ${job?.data?.gameId} : ${err}`
    );
    throw new Error(
      `Error when sending final proof ${job?.data?.gameId} : ${err}`
    );
  }
};

/**
 * Verifies whether games with status PENDING exist on-chain, and updates their status accordingly.
 *
 * @param verificationKeyHash - The hash of the on-chain verification key.
 * @throws Will throw if the verification fails or updateManyGames fails.
 */
export const checkGameCreation = async (
  verificationKeyHash: Field
): Promise<void> => {
  let pendingGames: { _id: string; lastProof: string }[] = [] as {
    _id: string;
    lastProof: string;
  }[];
  let activeGames: string[] = [];
  let fakeGames: string[] = [];

  try {
    // Get all games marked as PENDING in DB
    pendingGames = await getPendingGames();
  } catch (error) {
    console.error('Error fetching games: ', error);
    throw new Error(`Error fetching pending games: ${error}`);
  }

  // For each pending game, validate on-chain existence and integrity
  const promises = pendingGames.map(async (game) => {
    try {
      const zkAppPublicKey = PublicKey.fromBase58(game._id);
      let response = await fetchAccount({ publicKey: zkAppPublicKey });

      // Proceed if the zkApp account is deployed
      if (response.account !== undefined) {
        const zkApp = new MastermindZkApp(zkAppPublicKey);
        // Get on-chain solution hash
        const solutionHash = await zkApp.solutionHash.get();
        // Get solution hash from base proof stored in DB
        const baseProof = await StepProgramProof.fromJSON(
          JSON.parse(game.lastProof)
        );
        const baseProofSolutionHash =
          baseProof.publicOutput.solutionHash.toString();

        // Get verification key from the on-chain contract
        const vk = response.account?.zkapp?.verificationKey?.hash;
        // Validate both solution hash and verification key hash
        if (
          vk?.toString() === verificationKeyHash.toString() &&
          solutionHash?.toString() === baseProofSolutionHash
        ) {
          activeGames.push(game._id);
        } else {
          fakeGames.push(game._id);
        }
      }
    } catch (err) {
      console.error(`Error on game ${game._id}: `, err);
      throw new Error(`Error checking game ${game._id} creation: ${err}`);
    }
  });
  await Promise.all(promises);
  if (activeGames.length) {
    // Mark validated games as ACTIVE in the DB
    await updateManyGames(activeGames, GameStatus.ACTIVE);
  }
  if (fakeGames.length) {
    await deleteManyGames(fakeGames);
  }
};

/**
 * Handles the forfeit win logic.
 *
 * @param job - The BullMQ job containing the game ID and the winner’s public key.
 * @throws Will throw if transaction creation or submission fails.
 */
export const forfeitWin = async (job: Job) => {
  try {
    const nonce = await redisClient.incr(`${SERVER_PUBLIC_KEY}:nonce`);
    const { gameId, winnerPublicKeyBase58 } = job.data;
    const senderPrivateKey = PrivateKey.fromBase58(SERVER_PRIVATE_KEY);
    const senderPublicKey = senderPrivateKey.toPublicKey();
    const winnerPublicKey = PublicKey.fromBase58(winnerPublicKeyBase58);
    const zkApp = new MastermindZkApp(PublicKey.fromBase58(gameId));
    console.log('creating transaction...');
    const transaction = await Mina.transaction(
      {
        sender: senderPublicKey,
        fee: TRANSACTION_FEE,
        nonce: nonce,
      },
      async () => {
        await zkApp.forfeitWin(winnerPublicKey);
      }
    );
    console.log('proving transaction..., Used nonce in tx : ', nonce);
    await transaction.prove();
    transaction.sign([senderPrivateKey]);
    console.log('sending transaction...');
    const pendingTx = await transaction.send();
    await redisClient.incr(`${SERVER_PUBLIC_KEY}:lastNonce`);
    console.log('Transaction sent: ', pendingTx.hash);
    const txHash = pendingTx.hash;
    const game = await createOrUpdateGame({
      _id: gameId,
      penalizationTransactionHash: txHash,
    });
    return game;
  } catch (err) {
    console.error(`Error when penalizing game ${job?.data?.gameId} : ${err}`);

    throw new Error(`Error when penalizing game ${job?.data?.gameId} : ${err}`);
  }
};

/**
 * Initializes the server nonce in Redis by reading the current account nonce from Mina.
 *
 * This is used to prevent nonce mismatch errors.
 *
 * @throws Will throw if the account is not found on-chain.
 */
export const initializeServerNonce = async () => {
  await setNonceToRedis('nonce');
  await setNonceToRedis('lastNonce');
};

const setNonceToRedis = async (key: string) => {
  const nonceKey = `${SERVER_PUBLIC_KEY}:${key}`;
  const existingNonce = await redisClient.get(nonceKey);

  if (existingNonce !== null) {
    console.log(`${key} already set in Redis: ${existingNonce}`);
  } else {
    if (!SERVER_PUBLIC_KEY) {
      throw new Error('Missing Public KEY ');
    }

    const publicKey = PublicKey.fromBase58(SERVER_PUBLIC_KEY);

    const res = await fetchAccount({ publicKey });
    const nonce = res?.account?.nonce?.toString();

    if (nonce !== undefined) {
      await redisClient.set(nonceKey, Number(nonce) - 1);
      console.log(`${key} : ${Number(nonce) - 1} saved to Redis`);
    }
  }
};
