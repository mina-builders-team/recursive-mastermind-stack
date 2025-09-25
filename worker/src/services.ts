/**
 *
 * This module provides utility functions invoked by the worker to interact
 * with the blockchain and database for game lifecycle tasks.
 */

import { Job, Queue } from 'bullmq';
import {
  fetchAccount,
  Field,
  Mina,
  Poseidon,
  PrivateKey,
  PublicKey,
  verify,
} from 'o1js';
import {
  Clue,
  MastermindZkApp,
  MAX_ATTEMPTS,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import {
  countGamesByStatus,
  createOrUpdateGame,
  deleteManyGames,
  getGameById,
  getPendingGames,
  updateManyGames,
} from './repositories/game.js';
import redisClient from './redisClient.js';
import { GameStatus, IGame } from './models/Game.js';
import Player, { IPlayer } from './models/Player.js';

dotenv.config();

const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string;
const SERVER_PUBLIC_KEY = process.env.SERVER_PUBLIC_KEY as string;
const TRANSACTION_FEE = 1e8;

/**
 * Verifies whether games with status PENDING exist on-chain, and updates their status accordingly.
 *
 * @param verificationKeyHash - The hash of the on-chain verification key.
 * @throws Will throw if the verification fails or updateManyGames fails.
 */
export const checkGameCreation = async (
  verificationKeyHash: Field
): Promise<void> => {
  let pendingGames: { _id: string; lastProof: string; timestamp: number }[] =
    [] as {
      _id: string;
      lastProof: string;
      timestamp: number;
    }[];
  let activeGames: string[] = [];
  let fakeGames: string[] = [];
  let page = 0;
  let reachedEnd = false;
  const activeGamesCount = await countGamesByStatus(GameStatus.ACTIVE);
  const MAX_ALLOWED_ACTIVE_GAMES = 60;

  while (
    activeGamesCount + activeGames.length < MAX_ALLOWED_ACTIVE_GAMES &&
    !reachedEnd
  ) {
    try {
      page++;
      const take =
        MAX_ALLOWED_ACTIVE_GAMES - (activeGamesCount + activeGames.length);
      pendingGames = await getPendingGames({ page, pageSize: take });
    } catch (error) {
      console.error('Error fetching games: ', error);
      throw new Error(`Error fetching pending games: ${error}`);
    }
    // For each pending game, validate on-chain existence and integrity
    const promises = pendingGames.map(async (game) => {
      try {
        let zkAppPublicKey;
        try {
          zkAppPublicKey = PublicKey.fromBase58(game._id);
        } catch (e) {
          fakeGames.push(game._id);
          throw e;
        }
        let response = await fetchAccount({ publicKey: zkAppPublicKey });
        // Detect stale games
        const now = Date.now();
        const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

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
        } else if (game?.timestamp < threeDaysAgo) {
          fakeGames.push(game._id);
        }
      } catch (err) {
        console.error(`Error on game ${game._id}: `, err);
      }
    });
    await Promise.all(promises);
    reachedEnd = pendingGames.length === 0;
  }
  if (activeGames.length) {
    // Mark validated games as ACTIVE in the DB
    await updateManyGames(activeGames, GameStatus.ACTIVE);
  }
  if (fakeGames.length) {
    await deleteManyGames(fakeGames);
  }
};

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
      finalTransactionTimestamp: Date.now(),
    });
    console.log(
      `Proof submitted for game ${gameId}, transaction hash: ${txHash}`
    );
    await updatePlayerStatsFromGame(game);
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
      finalTransactionTimestamp: Date.now(),
    });
    await updatePlayerStatsFromGame(game);
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

export async function updatePlayerStatsFromGame(game: IGame) {
  if (!game.winnerPublicKeyBase58) return;
  const isWin = (pubKey: string) => game.winnerPublicKeyBase58 === pubKey;
  const isFirstGame = (lastGameDate: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = new Date(lastGameDate);
    lastDate.setHours(0, 0, 0, 0);
    return today > lastDate;
  };

  const codeBreakerStats = await Player.findOneAndUpdate(
    { _id: game.codeBreaker },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const codeMasterStats = await Player.findOneAndUpdate(
    { _id: game.codeMaster },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  // Code Breaker Updates
  if (game.codeBreaker) {
    const breaker = codeBreakerStats;
    breaker.gamesPlayed += 1;
    if (isFirstGame(breaker.lastGameDate)) {
      breaker.totalScore += 25;
      breaker.lastGameDate = new Date();
    }
    if (isWin(game.codeBreaker)) {
      breaker.winsAsCodeBreaker += 1;
      breaker.currentStreak += 1;
      breaker.maxStreak = Math.max(breaker.maxStreak, breaker.currentStreak);
      if (breaker.currentStreak % 3 === 0) {
        breaker.totalScore += 50;
      }
      breaker.netRewards += game.rewardAmount;
      breaker.totalScore +=
        (MAX_ATTEMPTS - Math.floor(game.turnCount / 2) + 1) * 20;
      if (game.turnCount <= 3) {
        breaker.totalScore += 60;
        breaker.crackedInFirst = true;
      }
      if (game.turnCount === 15) {
        breaker.crackedInLast = true;
      }
    } else {
      breaker.currentStreak = 0;
      breaker.netRewards -= game.rewardAmount;
    }

    await updateBadges(breaker);
    await breaker.save();
  }
  // Code Master Updates
  const master = codeMasterStats;
  master.gamesPlayed += 1;
  master.createdGames += 1;
  if (isFirstGame(master.lastGameDate)) {
    master.totalScore += 25;
    master.lastGameDate = new Date();
  }
  if (isWin(game.codeMaster)) {
    master.winsAsCodeMaster += 1;
    master.totalScore += 100 + Math.floor(game.turnCount / 2) * 5;
    master.currentStreak += 1;
    master.maxStreak = Math.max(master.maxStreak, master.currentStreak);
    master.netRewards += game.rewardAmount;
  } else {
    master.totalScore += (Math.floor(game.turnCount / 2) - 1) * 5;
    master.currentStreak = 0;
    master.netRewards -= game.rewardAmount;
  }
  await updateBadges(master);
  await master.save();
}

async function updateBadges(player: IPlayer) {
  const newBadges: string[] = [];

  // First Game Played
  if (player.gamesPlayed >= 1) newBadges.push('First Game Played');

  // First Code Solved
  if (player.winsAsCodeBreaker >= 1) newBadges.push('First Code Solved');

  // 5 Games Won
  if (player.winsAsCodeBreaker + player.winsAsCodeMaster >= 5)
    newBadges.push('5 Games Won');

  // 3 Streak
  if (player.maxStreak >= 3) newBadges.push('3 Streak');

  // Guessed in 2
  if (player.crackedInFirst) newBadges.push('Guessed in 1');

  // Guessed in Last
  if (player.crackedInLast) newBadges.push('Guessed in Last');

  // 5 Unbroken Code
  if (player.winsAsCodeMaster >= 5) newBadges.push('5 Unbroken Code');

  // TOP 100 & TOP 1000
  const betterPlayersCount = await Player.countDocuments({
    totalScore: { $gt: player.totalScore },
  });

  if (betterPlayersCount < 100) {
    newBadges.push('Top 100');
    newBadges.push('Top 1000');
  } else if (betterPlayersCount < 1000) {
    newBadges.push('Top 1000');
  }
  player.badges = newBadges;
}

export const processReceivedProof = async (
  job: Job,
  gameLifecycleQueue: Queue
) => {
  try {
    const {
      gameId,
      zkProof,
      receivedRewardAmount,
      playerPubKeyBase58,
      vk,
      roomName,
      gameCreationTransactionHash,
    } = job.data;
    const game = await getGameById(gameId);

    // Extract the last proof from game state, if it exists
    let lastProof = game?.lastProof || null;
    let lastTurnCount = null;
    const gameRewardAmount = game?.rewardAmount || receivedRewardAmount;

    // Extract turn count from last proof if available
    if (lastProof) {
      const proof = await StepProgramProof.fromJSON(JSON.parse(lastProof));
      lastTurnCount = Number(proof.publicOutput.turnCount.toString());
    }

    // Variables for parsed proof and its properties
    let turnCount, isSolved, receivedProof;

    // Deserialize and verify the submitted zkProof
    try {
      receivedProof = await StepProgramProof.fromJSON(JSON.parse(zkProof));
      const validProof = await verify(receivedProof, vk);
      if (!validProof) throw new Error('Invalid zkProof!');
    } catch (e) {
      console.error('Error verifying proof:', e);
      return { error: 'Invalid zkProof rejected!', gameId };
    }
    // Extract the turn count from the verified proof
    const receivedTurnCount = Number(
      receivedProof.publicOutput.turnCount.toString()
    );
    // Reject if the submitted proof does not represent the next turn
    if (receivedTurnCount - (lastTurnCount || 0) !== 1) {
      return { error: 'Outdated proof rejected!', gameId };
    }
    // Verify that the Code Breaker's public key matches the one stored on-chain
    if (receivedTurnCount === 2) {
      const receivedCodeBreaker =
        receivedProof.publicOutput.codeBreakerId.toString();
      if (
        !game ||
        !game.codeBreaker ||
        Poseidon.hash(
          PublicKey.fromBase58(game.codeBreaker).toFields()
        ).toString() !== receivedCodeBreaker
      ) {
        return {
          error:
            'A player attempted to join as code breaker, but they were not authorized!',
          gameId,
        };
      }
    }
    // If it's the code master's turn (odd turn), check if game is solved
    if (receivedTurnCount % 2 !== 0 && receivedTurnCount > 1) {
      turnCount = Number(receivedProof.publicOutput.turnCount.toString());
      const deserializedClue = Clue.decompress(
        receivedProof.publicOutput.lastcompressedClue
      );
      isSolved = deserializedClue.isSolved().toBoolean();
    }

    let winnerPublicKeyBase58 = null;
    if (isSolved || (turnCount && turnCount > MAX_ATTEMPTS * 2)) {
      winnerPublicKeyBase58 = isSolved ? game?.codeBreaker : game?.codeMaster;
      await gameLifecycleQueue.add(
        'sendFinalProof',
        { gameId, zkProof, winnerPublicKeyBase58 },
        { priority: 1 }
      );
    }

    const timestamp = Date.now();
    const updatedGame = await createOrUpdateGame({
      _id: gameId,
      lastProof: zkProof,
      timestamp,
      rewardAmount: gameRewardAmount,
      codeMaster:
        lastTurnCount === null && playerPubKeyBase58
          ? playerPubKeyBase58
          : undefined,
      turnCount: receivedTurnCount,
      winnerPublicKeyBase58: winnerPublicKeyBase58 || undefined,
      status: winnerPublicKeyBase58 ? GameStatus.ENDED : undefined,
      gameCreationTransactionHash:
        lastTurnCount === null ? gameCreationTransactionHash : undefined,
      roomName: lastTurnCount === null ? roomName : undefined,
    });
    return { zkProof, timestamp, game: updatedGame, gameId };
  } catch (err) {
    console.error(`Error when penalizing game ${job?.data?.gameId} : ${err}`);
    throw new Error(`Error when penalizing game ${job?.data?.gameId} : ${err}`);
  }
};
