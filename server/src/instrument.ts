import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import dotenv from 'dotenv';
dotenv.config();
const SENTRY_DSN = process.env.SENTRY_DSN as string;

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: false,

  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
