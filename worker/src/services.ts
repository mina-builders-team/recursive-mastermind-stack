import { Job } from 'bullmq';
import {
  AccountUpdate,
  fetchAccount,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
} from 'o1js';
import {
  Combination,
  MastermindZkApp,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import {
  createOrUpdateGame,
  getPendingGames,
  updateManyGames,
} from './repositories/game.js';
import redisClient from './redisClient.js';

dotenv.config();

const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string;
const SERVER_PUBLIC_KEY = process.env.SERVER_PUBLIC_KEY as string;
const TRANSACTION_FEE = 1e8;

export const sendFinalProof = async (job: Job) => {
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
};

export const checkGameCreation = async () => {
  let pendingGames: { _id: string }[] = [];
  let activeGames: string[] = [];
  try {
    pendingGames = await getPendingGames();
  } catch (error) {
    console.error('Error fetching games: ', error);
  }
  const promises = pendingGames.map(async (game) => {
    try {
      const zkAppPublicKey = PublicKey.fromBase58(game._id);
      let response = await fetchAccount({ publicKey: zkAppPublicKey });
      if (response.account !== undefined) {
        activeGames.push(game._id);
      }
    } catch (err) {
      console.error(`Error on game ${game._id}: `, err);
    }
  });
  await Promise.all(promises);
  if (activeGames.length) {
    await updateManyGames(activeGames);
  }
};

export const forfeitWin = async (job: Job) => {
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
};
export const createGame = async (job: Job) => {
  console.log(
    'processing job +++++++++++ ',
    job.id,
    'in worker ',
    process.env.name
  );
  const nonce = await redisClient.incr(`${SERVER_PUBLIC_KEY}:nonce`);
  const senderPrivateKey = PrivateKey.fromBase58(SERVER_PRIVATE_KEY);
  const senderPublicKey = senderPrivateKey.toPublicKey();
  const zkAppPrivateKey = PrivateKey.random();
  const zkAppPublicKey = zkAppPrivateKey.toPublicKey();
  const zkApp = new MastermindZkApp(zkAppPublicKey);
  const tx1 = await Mina.transaction(
    {
      sender: senderPublicKey,
      fee: 1e8,
      nonce,
    },
    async () => {
      AccountUpdate.fundNewAccount(senderPublicKey);
      await zkApp!.deploy();
      await zkApp.initGame(
        Combination.from([1, 2, 3, 4]),
        Field.random(),
        PublicKey.fromBase58(
          'B62qiaUDjv6eeRrwVCy68WVb6W2cYe1Bev8vjcoKzr3QNkXFoxFutf5'
        ),
        UInt64.from(10000000000)
      );
    }
  );
  console.log('proving transaction..., Used nonce in tx : ', nonce);
  await tx1.prove();
  console.log('sending transaction...');
  tx1.sign([senderPrivateKey, zkAppPrivateKey]);
  const pendingTx = await tx1.send();
  await redisClient.incr(`${SERVER_PUBLIC_KEY}:lastNonce`);
  console.log(`Tx 1: hash : ${pendingTx.hash}`);
};
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
