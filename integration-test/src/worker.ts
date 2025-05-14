/* eslint-disable no-unused-vars */
import { Mina } from 'o1js';
import {
  MastermindZkApp,
  StepProgram,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';

import { Worker, Job } from 'bullmq';
import { MastermindGame } from './MastermindGame.js';
dotenv.config();

const REDIS_PORT = parseInt(process.env.REDIS_PORT as string) || 6379;
const REDIS_HOST = process.env.REDIS_HOST as string;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const NETWORK_URL = process.env.MINA_NETWORK_URL as string;

const network = Mina.Network(NETWORK_URL);
Mina.setActiveInstance(network);
async function initialize() {
  console.log('Compiling StepProgram...');
  console.time('StepProgram compilation');
  await StepProgram.compile();
  console.log('StepProgram compiled');
  console.timeEnd('StepProgram compilation');
  console.log('Compiling MastermindZkApp...');
  console.time('zkApp compilation');
  await MastermindZkApp.compile();
  console.log('MastermindZkApp compiled');
  console.timeEnd('zkApp compilation');
}

initialize().then(() => {
  const proofWorker = new Worker(
    'gameTestQueue',
    async (job: Job) => {
      try {
        new MastermindGame(
          job.data.codeMaster,
          job.data.codeBreaker,
          job.data.attempts,
          {
            penalizedPlayer: job.data?.options?.penalizedPlayer,
            autoPlay: job.data?.options?.autoPlay,
          }
        );
      } catch (e) {
        console.log(e);
      }
    },
    {
      connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
      },
      lockDuration: 300000,
      concurrency: 1,
    }
  );

  proofWorker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} completed successfully.`);
  });

  proofWorker.on('failed', async (job) => {
    console.error(`Job ${job?.id} failed: `);
  });
  proofWorker.on('error', (err) => {
    console.error(err);
  });

  console.log(process.env.name, ' initialized ');
});
