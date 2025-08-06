import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

dotenv.config();

let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URL as string;

  const connectWithRetry = async () => {
    try {
      await mongoose.connect(mongoUri);
      reconnectAttempts = 0;
      isReconnecting = false;
    } catch {
      reconnectAttempts++;
      console.warn(`Retry ${reconnectAttempts} failed`);

      await connectWithRetry();
    }
  };

  mongoose.connection.on('disconnected', async () => {
    console.warn('MongoDB disconnected!');
    if (!isReconnecting) {
      isReconnecting = true;
      reconnectAttempts = 0;
      await connectWithRetry();
    }
  });
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
    isReconnecting = false;
    reconnectAttempts = 0;
  });
  mongoose.connection.on('error', (err) => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      Sentry.captureException(err);
      console.error(
        `MongoDB failed to connect after max attempts with error ${err}. Shutting down.`
      );
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });

  await connectWithRetry();
}
