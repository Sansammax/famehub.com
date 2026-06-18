import Redis from 'ioredis';
import { logger } from './logger.js';

let redis = null;
let useRedisMock = false;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: false
  });
  redis.on('error', (err) => {
    logger.warn('[Redis] Connection error, falling back to local memory cache: ' + err.message);
    useRedisMock = true;
  });
  redis.on('connect', () => {
    logger.info('[Redis] Successfully connected to Redis server.');
    useRedisMock = false;
  });
} catch (error) {
  logger.warn('[Redis] Initialization error, using mock memory cache: ' + error.message);
  useRedisMock = true;
}

const memoryCache = new Map();

export const cacheSet = async (key, val, ttlSeconds) => {
  if (useRedisMock || !redis) {
    memoryCache.set(key, { value: val, expiry: Date.now() + ttlSeconds * 1000 });
  } else {
    try {
      await redis.set(key, JSON.stringify(val), 'EX', ttlSeconds);
    } catch (e) {
      useRedisMock = true;
      memoryCache.set(key, { value: val, expiry: Date.now() + ttlSeconds * 1000 });
    }
  }
};

export const cacheGet = async (key) => {
  if (useRedisMock || !redis) {
    const data = memoryCache.get(key);
    if (!data) return null;
    if (data.expiry < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return data.value;
  } else {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      useRedisMock = true;
      const data = memoryCache.get(key);
      if (!data) return null;
      if (data.expiry < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return data.value;
    }
  }
};

export const cacheDel = async (key) => {
  memoryCache.delete(key);
  if (redis && !useRedisMock) {
    try {
      await redis.del(key);
    } catch (e) {
      useRedisMock = true;
    }
  }
};

export const getOrSet = async (key, ttlSeconds, fn) => {
  const cached = await cacheGet(key);
  if (cached !== null) {
    return cached;
  }
  const freshData = await fn();
  await cacheSet(key, freshData, ttlSeconds);
  return freshData;
};

export const getRedisStatus = () => {
  if (!redis) return { connected: false, mock: true };
  return {
    connected: redis.status === 'ready',
    mock: useRedisMock
  };
};

export const invalidatePattern = async (pattern) => {
  // Clear from local memoryCache
  const prefix = pattern.replace('*', '');
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  // Clear from Redis
  if (redis && !useRedisMock) {
    try {
      const keys = await redis.keys(pattern);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (e) {
      useRedisMock = true;
    }
  }
};

export { redis };
export default redis;
