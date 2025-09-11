/**
 * Entry point for the BullMQ worker that processes game lifecycle jobs.
 *
 * This worker listens to the `gameLifecycleQueue` and handles critical zkApp-related
 * tasks such as checking game creation on-chain, sending final game proofs, and
 * resolving forfeits. It also manages automatic recovery on failure using Redis,
 * synchronizes nonce values, and reports errors to Sentry.
 *
 */
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
  processReceivedProof,
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
const WORKER_QUEUE = process.env.WORKER_QUEUE || 'gameLifecycleQueue';

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

const MAX_JOBS = 50;
let completedJobs = 0;

/**
 * Initializes the worker by compiling zkApps, connecting to DB,
 * and initializing the nonce value used by the server account.
 */
async function initialize() {
  if (WORKER_QUEUE === 'gameLifecycleQueue') {
    console.time('compiling');
    await StepProgram.compile();
    const { verificationKey } = await MastermindZkApp.compile();
    verificationKeyHash = verificationKey.hash;
    console.timeEnd('compiling');
    await initializeServerNonce();
  }
  await connectDatabase();
}

initialize()
  .then(() => {
    const proofWorker = new Worker(
      WORKER_QUEUE,
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
          } else if (job.name === 'processReceivedProof') {
            return await processReceivedProof(job, gameLifecycleQueue);
          }
        } catch (err) {
          const error = err ?? new Error(`Unknown error in job ${job?.id}`);
          Sentry.captureException(error);
          throw error;
        }
      },
      {
        connection: {
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
        },
        lockDuration: 600000,
        concurrency: WORKER_QUEUE === 'proofVerificationQueue' ? 8 : 1,
      }
    );

    proofWorker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully.`);
      if (WORKER_QUEUE === 'proofVerificationQueue') {
        completedJobs++;
        if (completedJobs >= MAX_JOBS) {
          setImmediate(async () => {
            try {
              console.info(
                'Worker reached max jobs limit, initiating graceful restart'
              );
              await proofWorker.close();
              process.exit(0);
            } catch (error) {
              console.error(`Error during worker shutdown ${error}`);
              process.exit(1);
            }
          });
        }
      }
    });

    proofWorker.on('failed', async (job, err) => {
      const error = err ?? new Error(`Unknown error in job ${job?.id}`);
      Sentry.captureException(error);

      console.error(
        `Job ${job?.id} failed: -------------------- `,
        process.env.name
      );
      if (WORKER_QUEUE === 'gameLifecycleQueue') {
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

/**
 * Checks if the server's account has enough balance to send transactions.
 * notify via Sentry if the balance is below a threshold.
 *
 * @throws If balance fetch fails.
 */
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
