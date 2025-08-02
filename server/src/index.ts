/*
This file contains the main logic to run the server that powers Mina Mastermind’s backend. It handles:

-HTTP REST endpoints (via Express)
-Real-time game communication (via WebSockets)
-Proof processing and game lifecycle management (via BullMQ queue)
-Scheduled background tasks
-Error monitoring
*/

import './instrument.js';
import * as Sentry from '@sentry/node';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Queue, QueueEvents } from 'bullmq';
import { setupContract } from './zkAppHandler.js';
import dotenv from 'dotenv';
import {
  handleGameStart,
  handleJoinGame,
  handlePenalize,
  handleProof,
  resumeOnChain,
} from './services.js';
import cors from 'cors';
import gamesRoute from './routes/gamesRoute.js';
import cron from 'node-cron';
import { connectDatabase } from './databaseConnection.js';
import redisClient from './redisClient.js';
import playerRoute from './routes/playerRoute.js';

// Environment Setup
dotenv.config();

// Express Server Initialization
const app = express();
app.use(cors());
app.use(express.json());

// Port configuration
const PORT = process.env.SERVER_PORT || 3000;

// Redis connection parameters
const REDIS_PORT = parseInt(process.env.REDIS_PORT as string) || 6379;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Compile & Load verification keys (step program & contract)
const verificationKeys = await setupContract();

// Connect to MongoDB
connectDatabase();

// Resume all in-progress games on startup by marking them as "on_chain" to continue execution on the blockchain
await resumeOnChain();

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Mounts game routes at the '/games' endpoint.
app.use('/games', gamesRoute);

app.use('/player', playerRoute);

// Healthcheck Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

// WebSocket Server Setup
const wss = new WebSocketServer({ server });
const activePlayers = new Map<string, Set<WebSocket>>();

// Queue to manage game tasks like game creation check, submitting final proof on chain, penalty, server balance check,etc.
const gameLifecycleQueue = new Queue('gameLifecycleQueue', {
  connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000 * 90,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 3600 * 24 * 30,
    },
  },
});

// Listens to events from the 'gameLifecycleQueue' for monitoring.
const queueEvents = new QueueEvents('gameLifecycleQueue', {
  connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD },
});

// Broadcasts updated game state on job completed
queueEvents.on('completed', ({ returnvalue }: any) => {
  if (returnvalue) {
    const players = activePlayers.get(returnvalue._id) || new Set();
    players.forEach((player: WebSocket) => {
      player.send(JSON.stringify({ game: returnvalue }));
    });
  }
});

// Logs errors from job failures
queueEvents.on('failed', async ({ failedReason, jobId }) => {
  try {
    const error = JSON.parse(failedReason.substring(failedReason.indexOf('{')));
    console.log(`Job ${jobId} failed with error : ${error?.statusText}`);
  } catch (err) {
    console.log('unknown error : ', err);
  }
});

// Schedule recurring jobs:
// - 'lobby-games': runs every minute to verify that all games created on the server
// - are also properly created on-chain.
await gameLifecycleQueue.upsertJobScheduler(
  'lobby-games',
  { pattern: '* * * * *' },
  {
    name: 'checkGameCreation',
    opts: {
      removeOnFail: true,
      removeOnComplete: true,
      priority: 2,
    },
  }
);

// - 'server-balance': runs daily at midnight to monitor the remaining balance of the server’s
// - account used for sending transactions. This helps avoid failures due to low funds.
await gameLifecycleQueue.upsertJobScheduler(
  'server-balance',
  { pattern: '0 0 * * *' },
  {
    name: 'checkServerBalance',
    opts: {
      removeOnFail: true,
      removeOnComplete: true,
      priority: 2,
    },
  }
);

// WebSocket Handler
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const {
        gameId,
        action,
        zkProof,
        rewardAmount,
        playerPubKeyBase58,
        refereePubKeyBase58,
        roomName,
        gameCreationTransactionHash,
      } = data;
      console.log('action : ', action);
      if (!gameId || !action) {
        ws.send(JSON.stringify({ error: 'Bad request!' }));
        return;
      }

      if (action === 'join') {
        console.log('joined a game!');
        await handleJoinGame(gameId, activePlayers, ws);
      } else if (action === 'sendProof') {
        console.log('received a proof!');
        await handleProof(
          gameId,
          zkProof,
          rewardAmount,
          playerPubKeyBase58,
          refereePubKeyBase58,
          activePlayers,
          ws,
          gameLifecycleQueue,
          verificationKeys.stepProgramVerificationKey,
          roomName,
          gameCreationTransactionHash
        );
      } else if (action === 'startGame') {
        console.log('starting the game!');
        await handleGameStart(
          gameId,
          activePlayers,
          ws,
          gameLifecycleQueue,
          verificationKeys.contractVerificationKey.hash
        );
      } else if (action === 'penalize') {
        await handlePenalize(gameId, activePlayers, ws, gameLifecycleQueue);
      } else {
        ws.send(JSON.stringify({ error: 'Unknown action!' }));
      }
    } catch (err) {
      console.error('Error processing message:', err);
      ws.send(JSON.stringify({ error: 'Internal error!' }));
      Sentry.captureException(err);
    }
  });

  // Clean up on socket close
  ws.on('close', () => {
    activePlayers.forEach((players, gameId) => {
      players.delete(ws);
      if (players.size === 0) {
        activePlayers.delete(gameId);
      }
    });
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    Sentry.captureException(err);
  });
});

/*
 Safety check: ensures the gameLifecycleQueue is not stuck in a paused state.
 When a job fails, the worker pauses the queue to handle recovery logic,
 then resumes it. However, if the worker crashes before resuming, the queue
 can remain paused indefinitely. This cron runs every 20 minutes and
 automatically resumes the queue if it has been paused for over 20 minutes.
*/
cron.schedule('*/20 * * * *', async () => {
  const isQueuePaused = await gameLifecycleQueue.isPaused();
  const gameLifecycleQueuePausedAt = await redisClient.get(
    'gameLifecycleQueue:paused'
  );
  if (
    isQueuePaused &&
    gameLifecycleQueuePausedAt &&
    Date.now() - Number(gameLifecycleQueuePausedAt) > 1000 * 60 * 20
  ) {
    console.log('Queue stuck in paused state, resuming...');
    const error = new Error('queue has been paused for over 20 minutes');
    Sentry.captureException(error);
    await gameLifecycleQueue.resume();
  }
});

// Error Monitoring with Sentry
Sentry.setupExpressErrorHandler(app);
