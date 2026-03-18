import {
  generateTokens,
  validateToken,
  validateRefreshToken,
  refreshAccessToken,
  UserRole,
} from './jwt';
import jwt from 'jsonwebtoken';
import fc from 'fast-check';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('JWT Token Generation and Validation', () => {
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const userId = 'user123';
      const role = UserRole.STUDENT;
      const email = 'student@example.com';

      const tokens = generateTokens(userId, role, email);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should include correct payload in access token', () => {
      const userId = 'user123';
      const role = UserRole.TEACHER;
      const email = 'teacher@example.com';

      const tokens = generateTokens(userId, role, email);
      const decoded = jwt.decode(tokens.accessToken) as any;

      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
      expect(decoded.email).toBe(email);
      expect(decoded.exp).toBeDefined();
    });

    it('should include correct payload in refresh token', () => {
      const userId = 'user456';
      const role = UserRole.PARENT;
      const email = 'parent@example.com';

      const tokens = generateTokens(userId, role, email);
      const decoded = jwt.decode(tokens.refreshToken) as any;

      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
      expect(decoded.email).toBe(email);
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        generateTokens('user123', UserRole.STUDENT, 'test@example.com');
      }).toThrow('JWT secrets not configured');
    });

    it('should throw error if JWT_REFRESH_SECRET is not configured', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        generateTokens('user123', UserRole.STUDENT, 'test@example.com');
      }).toThrow('JWT secrets not configured');
    });
  });

  describe('validateToken', () => {
    it('should validate and decode a valid access token', () => {
      const userId = 'user123';
      const role = UserRole.STUDENT;
      const email = 'student@example.com';

      const tokens = generateTokens(userId, role, email);
      const payload = validateToken(tokens.accessToken);

      expect(payload.userId).toBe(userId);
      expect(payload.role).toBe(role);
      expect(payload.email).toBe(email);
      expect(payload.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        validateToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', role: UserRole.STUDENT, email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => {
        validateToken(expiredToken);
      }).toThrow('Token expired');
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        validateToken('some-token');
      }).toThrow('JWT secret not configured');
    });

    it('should throw error for token signed with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId: 'user123', role: UserRole.STUDENT, email: 'test@example.com' },
        'wrong-secret',
        { expiresIn: '15m' }
      );

      expect(() => {
        validateToken(wrongToken);
      }).toThrow('Invalid token');
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate and decode a valid refresh token', () => {
      const userId = 'user123';
      const role = UserRole.TEACHER;
      const email = 'teacher@example.com';

      const tokens = generateTokens(userId, role, email);
      const payload = validateRefreshToken(tokens.refreshToken);

      expect(payload.userId).toBe(userId);
      expect(payload.role).toBe(role);
      expect(payload.email).toBe(email);
      expect(payload.exp).toBeDefined();
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        validateRefreshToken('invalid-token');
      }).toThrow('Invalid refresh token');
    });

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', role: UserRole.STUDENT, email: 'test@example.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' }
      );

      expect(() => {
        validateRefreshToken(expiredToken);
      }).toThrow('Refresh token expired');
    });

    it('should throw error if JWT_REFRESH_SECRET is not configured', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        validateRefreshToken('some-token');
      }).toThrow('JWT refresh secret not configured');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', () => {
      const userId = 'user123';
      const role = UserRole.STUDENT;
      const email = 'student@example.com';

      const tokens = generateTokens(userId, role, email);
      
      // Wait a moment to ensure different iat (issued at) timestamp
      const newAccessToken = refreshAccessToken(tokens.refreshToken);

      expect(typeof newAccessToken).toBe('string');
      // Tokens may be identical if generated in same second, so just verify it's valid
      const payload = validateToken(newAccessToken);
      expect(payload.userId).toBe(userId);
      expect(payload.role).toBe(role);
      expect(payload.email).toBe(email);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        refreshAccessToken('invalid-token');
      }).toThrow('Invalid refresh token');
    });

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', role: UserRole.STUDENT, email: 'test@example.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' }
      );

      expect(() => {
        refreshAccessToken(expiredToken);
      }).toThrow('Refresh token expired');
    });
  });

  describe('Token expiration configuration', () => {
    it('should set access token to expire in approximately 15 minutes', () => {
      const tokens = generateTokens('user123', UserRole.STUDENT, 'test@example.com');
      const decoded = jwt.decode(tokens.accessToken) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      
      // Should be approximately 15 minutes (900 seconds), allow 5 second tolerance
      expect(expiresIn).toBeGreaterThan(895);
      expect(expiresIn).toBeLessThanOrEqual(900);
    });

    it('should set refresh token to expire in approximately 7 days', () => {
      const tokens = generateTokens('user123', UserRole.STUDENT, 'test@example.com');
      const decoded = jwt.decode(tokens.refreshToken) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      
      // Should be approximately 7 days (604800 seconds), allow 5 second tolerance
      expect(expiresIn).toBeGreaterThan(604795);
      expect(expiresIn).toBeLessThanOrEqual(604800);
    });
  });

  describe('Different user roles', () => {
    it('should generate tokens for STUDENT role', () => {
      const tokens = generateTokens('user1', UserRole.STUDENT, 'student@example.com');
      const payload = validateToken(tokens.accessToken);
      expect(payload.role).toBe(UserRole.STUDENT);
    });

    it('should generate tokens for TEACHER role', () => {
      const tokens = generateTokens('user2', UserRole.TEACHER, 'teacher@example.com');
      const payload = validateToken(tokens.accessToken);
      expect(payload.role).toBe(UserRole.TEACHER);
    });

    it('should generate tokens for PARENT role', () => {
      const tokens = generateTokens('user3', UserRole.PARENT, 'parent@example.com');
      const payload = validateToken(tokens.accessToken);
      expect(payload.role).toBe(UserRole.PARENT);
    });

    it('should generate tokens for ADMIN role', () => {
      const tokens = generateTokens('user4', UserRole.ADMIN, 'admin@example.com');
      const payload = validateToken(tokens.accessToken);
      expect(payload.role).toBe(UserRole.ADMIN);
    });
  });

  // Property-Based Tests
  describe('Feature: insightu-platform, Property 1: OAuth authentication produces valid tokens', () => {
    it('should produce valid tokens for any valid user data', () => {
      // Custom arbitraries for user data
      const userIdArbitrary = fc.string({ minLength: 1, maxLength: 100 });
      const roleArbitrary = fc.constantFrom(
        UserRole.STUDENT,
        UserRole.TEACHER,
        UserRole.PARENT,
        UserRole.ADMIN
      );
      const emailArbitrary = fc.emailAddress();

      fc.assert(
        fc.property(
          userIdArbitrary,
          roleArbitrary,
          emailArbitrary,
          (userId, role, email) => {
            // Generate tokens with arbitrary user data
            const tokens = generateTokens(userId, role, email);

            // Property 1: Tokens should be generated (not null/undefined)
            expect(tokens).toBeDefined();
            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
            expect(typeof tokens.accessToken).toBe('string');
            expect(typeof tokens.refreshToken).toBe('string');

            // Property 2: Access token should be valid and contain correct user information
            const accessPayload = validateToken(tokens.accessToken);
            expect(accessPayload.userId).toBe(userId);
            expect(accessPayload.role).toBe(role);
            expect(accessPayload.email).toBe(email);
            expect(accessPayload.exp).toBeDefined();
            expect(typeof accessPayload.exp).toBe('number');

            // Property 3: Refresh token should be valid and contain correct user information
            const refreshPayload = validateRefreshToken(tokens.refreshToken);
            expect(refreshPayload.userId).toBe(userId);
            expect(refreshPayload.role).toBe(role);
            expect(refreshPayload.email).toBe(email);
            expect(refreshPayload.exp).toBeDefined();
            expect(typeof refreshPayload.exp).toBe('number');

            // Property 4: Access and refresh tokens should be different
            expect(tokens.accessToken).not.toBe(tokens.refreshToken);

            // Property 5: Tokens should have valid expiration times
            const now = Math.floor(Date.now() / 1000);
            expect(accessPayload.exp).toBeGreaterThan(now);
            expect(refreshPayload.exp).toBeGreaterThan(now);
            expect(refreshPayload.exp).toBeGreaterThan(accessPayload.exp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce tokens that can be used for token refresh', () => {
      const userIdArbitrary = fc.string({ minLength: 1, maxLength: 100 });
      const roleArbitrary = fc.constantFrom(
        UserRole.STUDENT,
        UserRole.TEACHER,
        UserRole.PARENT,
        UserRole.ADMIN
      );
      const emailArbitrary = fc.emailAddress();

      fc.assert(
        fc.property(
          userIdArbitrary,
          roleArbitrary,
          emailArbitrary,
          (userId, role, email) => {
            // Generate initial tokens
            const tokens = generateTokens(userId, role, email);

            // Use refresh token to get new access token
            const newAccessToken = refreshAccessToken(tokens.refreshToken);

            // Property: New access token should be valid and contain same user information
            expect(newAccessToken).toBeDefined();
            expect(typeof newAccessToken).toBe('string');

            const newPayload = validateToken(newAccessToken);
            expect(newPayload.userId).toBe(userId);
            expect(newPayload.role).toBe(role);
            expect(newPayload.email).toBe(email);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce unique tokens for different users', () => {
      const userDataArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom(UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT, UserRole.ADMIN),
        fc.emailAddress()
      );

      fc.assert(
        fc.property(
          userDataArbitrary,
          userDataArbitrary,
          (userData1, userData2) => {
            const [userId1, role1, email1] = userData1;
            const [userId2, role2, email2] = userData2;

            // Skip if user data is identical
            if (userId1 === userId2 && role1 === role2 && email1 === email2) {
              return;
            }

            const tokens1 = generateTokens(userId1, role1, email1);
            const tokens2 = generateTokens(userId2, role2, email2);

            // Property: Different users should get different tokens
            // (tokens may be same if generated in same millisecond with same data, but payloads differ)
            const payload1 = validateToken(tokens1.accessToken);
            const payload2 = validateToken(tokens2.accessToken);

            const isDifferent =
              payload1.userId !== payload2.userId ||
              payload1.role !== payload2.role ||
              payload1.email !== payload2.email;

            expect(isDifferent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
