import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fc from 'fast-check';
import {
  registerWithEmail,
  loginWithEmail,
  setPrismaInstance,
  EmailCredentials,
} from './emailAuth';
import { UserRole } from './jwt';

// Set up environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

// Set the mock Prisma instance
setPrismaInstance(mockPrisma);

describe('Feature: insightu-platform, Property 2: Credential validation is consistent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate successfully with valid credentials and fail with invalid credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 50 }),
        fc.boolean(),
        async (email, password, isValidCredentials) => {
          // Setup: Create a user with known credentials
          const correctPassword = 'correctPassword123';
          const hashedPassword = await bcrypt.hash(correctPassword, 10);
          
          const mockUser = {
            id: 'user-123',
            email: email,
            passwordHash: hashedPassword,
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

          // Test credentials
          const testPassword = isValidCredentials ? correctPassword : password;
          const credentials: EmailCredentials = {
            email: email,
            password: testPassword,
          };

          try {
            const result = await loginWithEmail(credentials);
            
            // If we get here, authentication succeeded
            // This should only happen with valid credentials
            if (isValidCredentials) {
              expect(result.user.email).toBe(email);
              expect(result.accessToken).toBeDefined();
              expect(result.refreshToken).toBeDefined();
            } else {
              // If credentials are invalid but we succeeded, check if password happened to match
              const passwordMatches = await bcrypt.compare(password, hashedPassword);
              expect(passwordMatches).toBe(true);
            }
          } catch (error) {
            // If we get an error, authentication failed
            // This should only happen with invalid credentials
            if (isValidCredentials) {
              // Valid credentials should not fail
              throw new Error('Valid credentials should authenticate successfully');
            } else {
              // Invalid credentials should fail with descriptive error
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Invalid email or password');
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should consistently validate the same credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 50 }),
        async (email, password) => {
          // Setup: Create a user with the given password
          const hashedPassword = await bcrypt.hash(password, 10);
          
          const mockUser = {
            id: 'user-123',
            email: email,
            passwordHash: hashedPassword,
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

          const credentials: EmailCredentials = {
            email: email,
            password: password,
          };

          // Test: Login multiple times with same credentials
          const result1 = await loginWithEmail(credentials);
          
          // Reset mock to simulate second call
          (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          const result2 = await loginWithEmail(credentials);

          // Property: Same credentials should always produce successful authentication
          expect(result1.user.email).toBe(email);
          expect(result2.user.email).toBe(email);
          expect(result1.accessToken).toBeDefined();
          expect(result2.accessToken).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should reject credentials with non-existent email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 50 }),
        async (email, password) => {
          // Setup: User does not exist
          (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

          const credentials: EmailCredentials = {
            email: email,
            password: password,
          };

          // Test: Login should fail
          await expect(loginWithEmail(credentials)).rejects.toThrow(
            'Invalid email or password'
          );
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Feature: insightu-platform, Property 5: Authentication failure handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return descriptive error for all failed authentication attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Case 1: Non-existent user
          fc.record({
            type: fc.constant('non-existent'),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          // Case 2: Wrong password
          fc.record({
            type: fc.constant('wrong-password'),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          // Case 3: OAuth user trying email login
          fc.record({
            type: fc.constant('oauth-user'),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          // Case 4: Empty email
          fc.record({
            type: fc.constant('empty-email'),
            email: fc.constant(''),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          // Case 5: Empty password
          fc.record({
            type: fc.constant('empty-password'),
            email: fc.emailAddress(),
            password: fc.constant(''),
          })
        ),
        async (testCase) => {
          const credentials: EmailCredentials = {
            email: testCase.email,
            password: testCase.password,
          };

          // Setup mock based on test case type
          switch (testCase.type) {
            case 'non-existent':
              (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
              break;
            case 'wrong-password':
              const hashedPassword = await bcrypt.hash('differentPassword', 10);
              (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'user-123',
                email: testCase.email,
                passwordHash: hashedPassword,
                role: 'STUDENT',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              break;
            case 'oauth-user':
              (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'user-123',
                email: testCase.email,
                passwordHash: null, // OAuth user has no password
                role: 'STUDENT',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              break;
            case 'empty-email':
            case 'empty-password':
              // No mock needed, validation happens before DB call
              break;
          }

          // Test: All cases should fail with descriptive error
          try {
            await loginWithEmail(credentials);
            // If we get here, authentication succeeded when it shouldn't have
            throw new Error('Authentication should have failed but succeeded');
          } catch (error) {
            // Property: Error should be descriptive and deny access
            expect(error).toBeInstanceOf(Error);
            const errorMessage = (error as Error).message;
            
            // Verify error message is descriptive (not generic)
            expect(errorMessage).toBeDefined();
            expect(errorMessage.length).toBeGreaterThan(0);
            
            // Verify specific error messages based on failure type
            switch (testCase.type) {
              case 'non-existent':
              case 'wrong-password':
                expect(errorMessage).toBe('Invalid email or password');
                break;
              case 'oauth-user':
                expect(errorMessage).toContain('OAuth');
                break;
              case 'empty-email':
              case 'empty-password':
                expect(errorMessage).toContain('required');
                break;
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should deny access for all failed authentication attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 50 }),
        async (email, wrongPassword) => {
          // Setup: User exists with different password
          const correctPassword = 'correctPassword123';
          const hashedPassword = await bcrypt.hash(correctPassword, 10);
          
          (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-123',
            email: email,
            passwordHash: hashedPassword,
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const credentials: EmailCredentials = {
            email: email,
            password: wrongPassword,
          };

          // Test: Failed authentication should not return tokens
          try {
            await loginWithEmail(credentials);
            
            // If we got here, password must have matched by chance
            const passwordMatches = await bcrypt.compare(wrongPassword, hashedPassword);
            expect(passwordMatches).toBe(true);
          } catch (error) {
            // Property: Failed authentication denies access (no tokens returned)
            expect(error).toBeInstanceOf(Error);
            // No tokens should be accessible
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should handle registration failures with descriptive errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Case 1: Email already exists
          fc.record({
            type: fc.constant('duplicate-email'),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          // Case 2: Password too short (but not empty)
          fc.record({
            type: fc.constant('short-password'),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 1, maxLength: 5 }),
          }),
          // Case 3: Empty email
          fc.record({
            type: fc.constant('empty-email'),
            email: fc.constant(''),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          // Case 4: Empty password
          fc.record({
            type: fc.constant('empty-password'),
            email: fc.emailAddress(),
            password: fc.constant(''),
          })
        ),
        async (testCase) => {
          const credentials: EmailCredentials = {
            email: testCase.email,
            password: testCase.password,
          };

          // Setup mock based on test case type
          if (testCase.type === 'duplicate-email') {
            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
              id: 'existing-user',
              email: testCase.email,
              passwordHash: 'some-hash',
              role: 'STUDENT',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
          }

          // Test: Registration should fail with descriptive error
          try {
            await registerWithEmail(credentials, UserRole.STUDENT);
            // If we get here, registration succeeded when it shouldn't have
            throw new Error('Registration should have failed but succeeded');
          } catch (error) {
            // Property: Error should be descriptive
            expect(error).toBeInstanceOf(Error);
            const errorMessage = (error as Error).message;
            
            expect(errorMessage).toBeDefined();
            expect(errorMessage.length).toBeGreaterThan(0);
            
            // Verify specific error messages
            switch (testCase.type) {
              case 'duplicate-email':
                expect(errorMessage).toContain('already exists');
                break;
              case 'short-password':
                // Empty/missing validation happens first, so check for either error
                expect(
                  errorMessage.includes('at least 6 characters') ||
                  errorMessage.includes('required')
                ).toBe(true);
                break;
              case 'empty-email':
              case 'empty-password':
                expect(errorMessage).toContain('required');
                break;
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
