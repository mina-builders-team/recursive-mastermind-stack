import dotenv from 'dotenv';
import { Redis } from 'ioredis';
import * as Sentry from '@sentry/node';

dotenv.config();

let client: Redis;

try {
  client = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    retryStrategy(times) {
      const delay = times * 500;
      console.log(`Redis retrying connection in ${delay}ms...`);
      if (times > 20) {
        const error = new Error('Redis failed to reconnect after 20 attempts');
        Sentry.captureException(error);
        setTimeout(() => {
          console.error('Shutting down app due to Redis failure');
          process.exit(1);
        }, 1000); 

        return null;
      }
      return delay;
    },
  });

  client.on('connect', () => {
    console.log('Redis client connected successfully');
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
} catch (err) {
  console.error('Failed to initialize Redis client:', err);
  Sentry.captureException(err);
  throw err;
}

export default client;
