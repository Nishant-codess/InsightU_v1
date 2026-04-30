import redisClient from '../../config/redis';

const SESSION_PREFIX = 'session:';

export interface SessionData {
  userId: string;
  token: string;
  createdAt: string;
}

/**
 * Creates a new session in Redis
 * @param userId - Unique user identifier
 * @param token - Authentication token (usually JWT or refresh token)
 * @param expiresInSeconds - Expiration time in seconds (default: 15 minutes)
 */
export async function createSession(userId: string, token: string, expiresInSeconds: number = 900): Promise<void> {
  const sessionData: SessionData = {
    userId,
    token,
    createdAt: new Date().toISOString(),
  };

  if (!redisClient) {
    console.warn('[session] Redis not configured, session not stored');
    return;
  }
  
  await redisClient.setEx(
    `${SESSION_PREFIX}${token}`,
    expiresInSeconds,
    JSON.stringify(sessionData)
  );
}

/**
 * Removes a session from Redis
 * @param token - Authentication token to invalidate
 */
export async function invalidateSession(token: string): Promise<void> {
  if (!redisClient) return;
  await redisClient.del(`${SESSION_PREFIX}${token}`);
}

/**
 * Validates if a session exists and has not expired
 * @param token - Authentication token to validate
 * @returns SessionData if valid, or null if invalid/expired
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  if (!redisClient) return null;
  const data = await redisClient.get(`${SESSION_PREFIX}${token}`);
  if (!data) {
    return null;
  }
  return JSON.parse(data) as SessionData;
}
