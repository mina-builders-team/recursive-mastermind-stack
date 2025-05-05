import { Worker, Job, Queue } from 'bullmq';
import { fetchAccount, Mina, PublicKey } from 'o1js';
import {
  MastermindZkApp,
  StepProgram,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import {
  checkGameCreation,
  createGame,
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
async function initialize() {
  console.time('compiling');
  await StepProgram.compile();
  await MastermindZkApp.compile();
  console.timeEnd('compiling');
  connectDatabase();
  await initializeServerNonce();
}

initialize()
  .then(() => {
    const proofWorker = new Worker(
      'gameLifecycleQueue',
      async (job: Job) => {
        if (job.name === 'checkGameCreation') {
          await checkGameCreation();
        } else if (job.name === 'sendFinalProof') {
          return await sendFinalProof(job);
        } else if (job.name === 'forfeitWin') {
          return await forfeitWin(job);
        } else if (job.name === 'createGame') {
          return await createGame(job);
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

    proofWorker.on('failed', async (job) => {
      console.error(
        `Job ${job?.id} failed: -------------------- `,
        process.env.name
      );
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
        if (accountNonce - 1 > Number(lastNonce)) {
          lastNonce = accountNonce;
        }
        await redisClient.set(`${SERVER_PUBLIC_KEY}:nonce`, lastNonce || 0);

        await gameLifecycleQueue.resume();
        await redisClient.del('gameLifecycleQueue:paused');
        console.log('Recover with nonce : ', lastNonce);
      }
    });
    proofWorker.on('error', (err) => {
      console.error(err);
    });

    console.log('Worker initialized');
  })
  .catch((error) => {
    console.error('Initialization failed:', error);
  });
