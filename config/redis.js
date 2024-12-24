const Redis = require('ioredis');
const { logger } = require('./logger');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const CACHE_PREFIXES = {
  USER: 'user:',
  PRODUCT: 'product:',
  REVIEW: 'review:',
  PAYMENT: 'payment:',
};

const TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

async function getCache(key) {
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    
    const uncompressed = await gunzip(Buffer.from(data, 'base64'));
    return JSON.parse(uncompressed.toString());
  } catch (error) {
    logger.error('Error getting cache', { key, error: error.message });
    return null;
  }
}

async function setCache(key, value, ttl = TTL.MEDIUM) {
  try {
    const compressed = await gzip(Buffer.from(JSON.stringify(value)));
    await redisClient.set(key, compressed.toString('base64'), 'EX', ttl);
  } catch (error) {
    logger.error('Error setting cache', { key, error: error.message });
  }
}

async function deleteCache(key) {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Error deleting cache', { key, error: error.message });
  }
}

async function clearCacheByPattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    logger.error('Error clearing cache by pattern', { pattern, error: error.message });
  }
}

const cacheMiddleware = (prefix, ttl = TTL.MEDIUM) => async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = `${prefix}${req.originalUrl}`;

  try {
    const cachedData = await getCache(key);
    if (cachedData) {
      return res.json(cachedData);
    }

    const originalJson = res.json;
    res.json = function(data) {
      setCache(key, data, ttl);
      originalJson.call(this, data);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error', error);
    next();
  }
};

module.exports = {
  redisClient,
  CACHE_PREFIXES,
  TTL,
  getCache,
  setCache,
  deleteCache,
  clearCacheByPattern,
  cacheMiddleware,
}; 