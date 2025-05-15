import { Queue } from 'bullmq';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();
console.log('Running tests');
const jsonGames = readFileSync('games.json', 'utf-8');
const gameList = JSON.parse(jsonGames);

const REDIS_PORT = 6380;
const REDIS_HOST = 'localhost';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const gameTestQueue = new Queue('gameTestQueue', {
  connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD },
});
const MINA_NETWORK = process.env.MINA_NETWORK;
const games = gameList?.[MINA_NETWORK!]?.slice(0, 1) as Array<{
  codeMaster: string;
  codeBreaker: string;
  attempts: number;
}>;
games.map((game) => {
  gameTestQueue.add('playGame', game);
});
