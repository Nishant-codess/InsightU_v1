import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

// Redis is optional - only connect if REDIS_URL is provided
const shouldUseRedis = process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379';

if (shouldUseRedis) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });
} else {
  console.log('Redis disabled - using in-memory cache');
}

export const connectRedis = async () => {
  if (redisClient && !redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
};

export default redisClient;
