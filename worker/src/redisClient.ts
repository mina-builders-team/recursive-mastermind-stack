import dotenv from 'dotenv';
import { createClient } from 'redis';
dotenv.config();

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST as string,
    port: Number(process.env.REDIS_PORT),
  },
  password: process.env.REDIS_PASSWORD,
});
client.on('error', (err) => console.error('Redis Client Error', err));

client.connect();

export default client;
