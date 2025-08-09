import dotenv from 'dotenv';
import { Redis } from 'ioredis';
dotenv.config();

const client = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
});

client.on('error', (err) => console.error('Redis Client Error', err));

export default client;
