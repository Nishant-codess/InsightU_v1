import jwt from 'jsonwebtoken';

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Generate access and refresh tokens for a user
 * @param userId - The user's unique identifier
 * @param role - The user's role
 * @param email - The user's email
 * @returns TokenPair containing access and refresh tokens
 */
export function generateTokens(
  userId: string,
  role: UserRole,
  email: string
): TokenPair {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  // Generate access token (15 minutes)
  const accessToken = jwt.sign(
    {
      userId,
      role,
      email,
    },
    jwtSecret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );

  // Generate refresh token (7 days)
  const refreshToken = jwt.sign(
    {
      userId,
      role,
      email,
    },
    jwtRefreshSecret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    }
  );

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Validate and decode an access token
 * @param token - The JWT token to validate
 * @returns TokenPayload if valid
 * @throws Error if token is invalid or expired
 */
export function validateToken(token: string): TokenPayload {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token validation failed');
    }
  }
}

/**
 * Validate and decode a refresh token
 * @param token - The refresh token to validate
 * @returns TokenPayload if valid
 * @throws Error if token is invalid or expired
 */
export function validateRefreshToken(token: string): TokenPayload {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtRefreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtRefreshSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token validation failed');
    }
  }
}

/**
 * Refresh an access token using a valid refresh token
 * @param refreshToken - The refresh token
 * @returns New access token
 * @throws Error if refresh token is invalid
 */
export function refreshAccessToken(refreshToken: string): string {
  const payload = validateRefreshToken(refreshToken);
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  // Generate new access token with same user data
  const accessToken = jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    },
    jwtSecret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );

  return accessToken;
}
