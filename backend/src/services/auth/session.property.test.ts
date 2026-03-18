import fc from 'fast-check';
import { createSession, validateSession, invalidateSession } from './session';
import redisClient from '../../config/redis';

// Mock Redis client for testing logic without a live store
jest.mock('../../config/redis', () => {
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    __esModule: true,
    default: {
      setEx: jest.fn(async (key: string, seconds: number, value: string) => {
        store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
      }),
      get: jest.fn(async (key: string) => {
        const item = store.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
          store.delete(key);
          return null; // Expired
        }
        return item.value;
      }),
      del: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      // Helper for testing fast-forwarding time inside mock
      _fastForwardByMs: (ms: number) => {
        const fakeNow = Date.now() + ms;
        jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
      },
      _store: store,
    },
  };
});

describe('Feature: insightu-platform, Property 7: Session expiration enforcement', () => {
  afterEach(() => {
    // Restore Original Date.now if it was mocked
    jest.restoreAllMocks();
    (redisClient as any)._store.clear();
  });

  it('should store and validate a session correctly (Round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // UserID
        fc.string({ minLength: 10 }), // Token
        async (userId, token) => {
          await createSession(userId, token, 900);
          
          const session = await validateSession(token);
          
          expect(session).not.toBeNull();
          expect(session?.userId).toBe(userId);
          expect(session?.token).toBe(token);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly invalidate a session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 10 }),
        async (userId, token) => {
          await createSession(userId, token, 900);
          
          // Must be valid first
          let session = await validateSession(token);
          expect(session).not.toBeNull();
          
          // Invalidate
          await invalidateSession(token);
          
          // Must be invalid
          session = await validateSession(token);
          expect(session).toBeNull();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should enforce session expiration after the set TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 10 }),
        fc.integer({ min: 1, max: 3600 }), // Expiration between 1 sec and 1 hour
        async (userId, token, expiresInSeconds) => {
          // Restore before creating
          jest.restoreAllMocks();
          
          await createSession(userId, token, expiresInSeconds);

          // Fast-forward time to JUST BEFORE expiration
          (redisClient as any)._fastForwardByMs(expiresInSeconds * 1000 - 100);
          let session = await validateSession(token);
          expect(session).not.toBeNull(); // Should still be valid

          // Fast-forward time to AFTER expiration
          (redisClient as any)._fastForwardByMs(expiresInSeconds * 1000 + 100);
          session = await validateSession(token);
          expect(session).toBeNull(); // Should be invalid now
          
          jest.restoreAllMocks();
        }
      ),
      { numRuns: 20 }
    );
  });
});
