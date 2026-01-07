/*** Redis Service
 *
 * ioredis client with:
 * - Separate clients for commands and pub/sub (required by Redis protocol)
 * - Connection health monitoring
 * - Graceful disconnect
 */

import { PRESENCE_TTL_SECONDS, REDIS_KEYS } from '@devradar/shared';
import { Redis, type RedisOptions } from 'ioredis';

import { env } from '@/config';
import { logger } from '@/lib/logger';

/**
 * Redis client instances.
 * We need separate clients for regular commands and pub/sub ***/
let commandClient: Redis | null = null;
let subscribeClient: Redis | null = null;
let publishClient: Redis | null = null;

/*** Common Redis options for all clients ***/
const commonOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error('Max Redis reconnection attempts reached');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    logger.warn({ attempt: times, delay }, 'Retrying Redis connection');
    return delay;
  },
  lazyConnect: true,
};

/*** Create a Redis client with event handlers ***/
function createClient(name: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    ...commonOptions,
    connectionName: `devradar-${name}`,
  });

  client.on('connect', () => {
    logger.debug({ client: name }, 'Redis connecting');
  });

  client.on('ready', () => {
    logger.info({ client: name }, '✅ Redis connected');
  });

  client.on('error', (error: Error) => {
    logger.error({ client: name, error }, 'Redis error');
  });

  client.on('close', () => {
    logger.debug({ client: name }, 'Redis connection closed');
  });

  return client;
}

/*** Get the command Redis client (for SET, GET, etc.) ***/
export function getRedis(): Redis {
  commandClient ??= createClient('command');
  return commandClient;
}

/*** Get the subscribe Redis client (for subscribing to channels).
 * Must be a separate client from command client ***/
export function getRedisSubscriber(): Redis {
  subscribeClient ??= createClient('subscriber');
  return subscribeClient;
}

/*** Get the publish Redis client (for publishing to channels) ***/
export function getRedisPublisher(): Redis {
  publishClient ??= createClient('publisher');
  return publishClient;
}

/*** Connect all Redis clients.
 * Call this during server startup ***/
export async function connectRedis(): Promise<void> {
  try {
    const cmd = getRedis();
    const sub = getRedisSubscriber();
    const pub = getRedisPublisher();

    await Promise.all([cmd.connect(), sub.connect(), pub.connect()]);

    logger.info('✅ All Redis clients connected');
  } catch (error) {
    logger.fatal({ error }, '❌ Failed to connect to Redis');
    throw error;
  }
}

/*** Disconnect all Redis clients.
 * Call this during graceful shutdown ***/
export async function disconnectRedis(): Promise<void> {
  const clients = [
    { name: 'command', client: commandClient },
    { name: 'subscribe', client: subscribeClient },
    { name: 'publish', client: publishClient },
  ].filter((c) => c.client !== null);

  const results = await Promise.allSettled(
    clients.map(async ({ name, client }) => {
      try {
        if (client) {
          await client.quit();
        }
      } catch (error: unknown) {
        logger.warn({ error, client: name }, 'Error closing Redis client');
        throw error;
      }
    })
  );
  /* Always nullify clients regardless of quit success */
  commandClient = null;
  subscribeClient = null;
  publishClient = null;

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.warn({ failureCount: failures.length }, 'Redis disconnected with some errors');
  } else {
    logger.info('Redis connections closed');
  }
}

/*** Health check - verify Redis connectivity ***/
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong.toUpperCase() === 'PONG';
  } catch {
    return false;
  }
}
/* =================== */
/* Presence Helpers */
/* =================== */

interface PresenceData {
  userId: string;
  status: string;
  activity?: Record<string, unknown> | undefined;
  updatedAt: number;
}

/**
 * Set user presence with TTL.
 * Only publishes to Redis if presence data has actually changed (throttling).
 *
 * @param userId - User ID
 * @param data - Presence data
 */
export async function setPresence(userId: string, data: PresenceData): Promise<void> {
  const redis = getRedis();
  const key = REDIS_KEYS.presence(userId);
  /* Get existing presence to check if it changed */
  const existing = await redis.get(key);
  const existingData = existing ? (JSON.parse(existing) as PresenceData) : null;
  /* Always update TTL with new data */
  await redis.setex(key, PRESENCE_TTL_SECONDS, JSON.stringify(data));
  /* Only publish if status or activity actually changed (throttle unchanged heartbeats) */
  const hasChanged =
    existingData?.status !== data.status ||
    JSON.stringify(existingData.activity) !== JSON.stringify(data.activity);

  if (hasChanged) {
    /* Fire-and-forget: don't await publish to avoid blocking on pub/sub failures */
    const pub = getRedisPublisher();
    pub
      .publish(REDIS_KEYS.presenceChannel(userId), JSON.stringify(data))
      .catch((error: unknown) => {
        logger.warn({ error, userId }, 'Failed to publish presence update');
      });
  }
}

/**
 * Get user presence.
 *
 * @param userId - User ID
 * @returns Presence data or null if not found/expired
 */
export async function getPresence(userId: string): Promise<PresenceData | null> {
  const redis = getRedis();
  const key = REDIS_KEYS.presence(userId);

  const data = await redis.get(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as PresenceData;
  } catch {
    return null;
  }
}

/**
 * Delete user presence.
 *
 * @param userId - User ID
 */
export async function deletePresence(userId: string): Promise<void> {
  const redis = getRedis();
  const key = REDIS_KEYS.presence(userId);

  await redis.del(key);
}

/**
 * Get multiple user presences at once.
 *
 * @param userIds - Array of user IDs
 * @returns Map of userId -> PresenceData
 */
export async function getPresences(userIds: string[]): Promise<Map<string, PresenceData>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const redis = getRedis();
  const keys = userIds.map((id) => REDIS_KEYS.presence(id));

  const results = await redis.mget(...keys);
  const presenceMap = new Map<string, PresenceData>();

  results.forEach((data: string | null, index: number) => {
    if (data) {
      try {
        const userId = userIds[index];
        if (userId) {
          presenceMap.set(userId, JSON.parse(data) as PresenceData);
        }
      } catch {
        /* Skip invalid data */
      }
    }
  });

  return presenceMap;
}
/* =================== */
/* Token Blacklist Helpers */
/* =================== */

const TOKEN_BLACKLIST_PREFIX = 'blacklist:';

/**
 * Add a token to the blacklist (for logout/revocation).
 *
 * @param token - JWT token or its jti to blacklist
 * @param ttlSeconds - TTL in seconds (should match remaining token expiry)
 */
export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return; // Token already expired

  const redis = getRedis();
  const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;

  await redis.setex(key, ttlSeconds, '1');
  logger.debug({ ttlSeconds }, 'Token blacklisted');
}

/**
 * Check if a token is blacklisted.
 *
 * @param token - JWT token or its jti to check
 * @returns true if token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = getRedis();
  const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;

  const exists = await redis.exists(key);
  return exists === 1;
}
