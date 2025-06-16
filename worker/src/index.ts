import './instrument.js';
import * as Sentry from '@sentry/node';
import { Worker, Job, Queue } from 'bullmq';
import { fetchAccount, Field, Mina, PublicKey } from 'o1js';
import {
  MastermindZkApp,
  StepProgram,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import {
  checkGameCreation,
  forfeitWin,
  initializeServerNonce,
  sendFinalProof,
} from './services.js';
import { connectDatabase } from './databaseConnection.js';
import redisClient from './redisClient.js';
dotenv.config();

const REDIS_PORT = parseInt(process.env.REDIS_PORT as string) || 6379;
const REDIS_HOST = process.env.REDIS_HOST as string;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const NETWORK_URL =
  process.env.MINA_NETWORK_URL || 'http://host.docker.internal:8080/graphql';
const SERVER_PUBLIC_KEY = process.env.SERVER_PUBLIC_KEY as string;

const network = Mina.Network({ mina: NETWORK_URL });
Mina.setActiveInstance(network);
const gameLifecycleQueue = new Queue('gameLifecycleQueue', {
  connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 3600 * 24 * 30,
    },
  },
});
let verificationKeyHash: Field;
async function initialize() {
  console.time('compiling');
  await StepProgram.compile();
  const { verificationKey } = await MastermindZkApp.compile();
  verificationKeyHash = verificationKey.hash;
  console.timeEnd('compiling');
  connectDatabase();
  await initializeServerNonce();
}

initialize()
  .then(() => {
    const proofWorker = new Worker(
      'gameLifecycleQueue',
      async (job: Job) => {
        try {
          if (job.name === 'checkGameCreation') {
            await checkGameCreation(verificationKeyHash);
          } else if (job.name === 'sendFinalProof') {
            return await sendFinalProof(job);
          } else if (job.name === 'forfeitWin') {
            return await forfeitWin(job);
          } else if (job.name === 'checkServerBalance') {
            await checkServerBalance();
          }
        } catch (err) {
          const error = err ?? new Error(`Unknown error in job ${job?.id}`);
          Sentry.captureException(error);
          throw error
        }
      },
      {
        connection: {
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
        },
        lockDuration: 300000,
      }
    );

    proofWorker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully.`);
    });

    proofWorker.on('failed', async (job, err) => {
      const error = err ?? new Error(`Unknown error in job ${job?.id}`);
      Sentry.captureException(error);

      console.error(
        `Job ${job?.id} failed: -------------------- `,
        process.env.name
      );

      await checkServerBalance();

      const isPaused = await gameLifecycleQueue.isPaused();
      if (!isPaused) {
        await redisClient.set('gameLifecycleQueue:paused', Date.now());
        await gameLifecycleQueue.pause();

        while ((await gameLifecycleQueue.getActiveCount()) > 0) {
          await new Promise((res) => setTimeout(res, 1000 * 10));
        }
        const res = await fetchAccount({
          publicKey: PublicKey.fromBase58(SERVER_PUBLIC_KEY),
        });
        const accountNonce = Number(res?.account?.nonce?.toString());
        let lastNonce = Number(
          await redisClient.get(`${SERVER_PUBLIC_KEY}:lastNonce`)
        );
        if (accountNonce - 1 > Number(lastNonce) || accountNonce === 0) {
          lastNonce = accountNonce - 1;
        }
        await redisClient.set(`${SERVER_PUBLIC_KEY}:nonce`, lastNonce || 0);

        await gameLifecycleQueue.resume();
        await redisClient.del('gameLifecycleQueue:paused');
        console.log('Recover with nonce : ', lastNonce);
      }
    });
    proofWorker.on('error', (err) => {
      const error = err ?? new Error(`Unknown error`);
      Sentry.captureException(error);
      console.error(err);
    });

    console.log('Worker initialized');
  })
  .catch((error) => {
    console.error('Initialization failed:', error);
    Sentry.captureException(error);
  });

const checkServerBalance = async () => {
  const serverPubKey = PublicKey.fromBase58(SERVER_PUBLIC_KEY);
  const serverAccount = await fetchAccount({ publicKey: serverPubKey });
  if (serverAccount?.account) {
    const balance = Number(serverAccount.account.balance?.toString());
    if (balance < 100 * 1e9) {
      const error = new Error(`insufficient server Balance `);
      Sentry.captureException(error);
    }
  }
};
