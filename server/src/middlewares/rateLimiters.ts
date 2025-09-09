import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../redisClient.js';

// HTTP Rate Limiter
export const httpRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'http_rate_limit',
  points: 150, // 150 requests
  duration: 5 * 60, // 15 minutes
  blockDuration: 60 * 3, // Block for 3 minutes if exceeded
});

// WebSocket Connection Limiter
export const wsConnectionLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ws_connection_limit',
  points: 100,
  duration: 60 * 60,
});

// WebSocket Action Limiter
export const wsActionLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ws_action_limit',
  points: 20, // max 20 actions
  duration: 60, // per 60 seconds
  blockDuration: 60,
});

// Protect HTTP routes
export async function rateLimitMiddleware(req: any, res: any, next: any) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  try {
    await httpRateLimiter.consume(ip);
    next();
  } catch {
    console.log(`Blocked IP: ${ip}`);
    res
      .status(429)
      .json({ error: 'Too many requests, please try again later.' });
  }
}
