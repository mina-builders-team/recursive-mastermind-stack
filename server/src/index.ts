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

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.SERVER_PORT || 3000;
const REDIS_PORT = parseInt(process.env.REDIS_PORT as string) || 6379;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const verificationKeys = await setupContract();
connectDatabase();

await resumeOnChain();
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
app.use('/games', gamesRoute);

const wss = new WebSocketServer({ server });
const activePlayers = new Map<string, Set<WebSocket>>();

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
const queueEvents = new QueueEvents('gameLifecycleQueue', {
  connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD },
});
queueEvents.on('completed', ({ returnvalue }: any) => {
  if (returnvalue) {
    const players = activePlayers.get(returnvalue._id) || new Set();
    players.forEach((player: WebSocket) => {
      player.send(JSON.stringify({ game: returnvalue }));
    });
  }
});
queueEvents.on('failed', async ({ failedReason, jobId }) => {
  try {
    const error = JSON.parse(failedReason.substring(failedReason.indexOf('{')));
    console.log(`Job ${jobId} failed with error : ${error?.statusText}`);
  } catch (err) {
    console.log('unknown error : ', err);
  }
});
await gameLifecycleQueue.upsertJobScheduler(
  'lobby-games',
  { pattern: '* * * * *' },
  {
    name: 'checkGameCreation',
    opts: {
      removeOnFail: true,
      removeOnComplete: true,
    },
  }
);
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
          verificationKeys.stepProgramVerificationKey
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
    }
  });

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
  });
});
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
    await gameLifecycleQueue.resume();
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});
