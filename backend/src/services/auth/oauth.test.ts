import { initiateGoogleOAuth, handleGoogleCallback, setPrismaInstance } from './oauth';
import { UserRole } from './jwt';

// Mock Prisma
jest.mock('@prisma/client');

// Mock fetch for OAuth token exchange
global.fetch = jest.fn();

describe('OAuth Service', () => {
  let mockPrisma: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    
    // Set the mock instance
    setPrismaInstance(mockPrisma as any);
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initiateGoogleOAuth', () => {
    it('should return a valid Google OAuth URL', () => {
      const result = initiateGoogleOAuth();

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=');
    });

    it('should throw error if Google OAuth credentials are not configured', () => {
      delete process.env.GOOGLE_CLIENT_ID;

      expect(() => initiateGoogleOAuth()).toThrow(
        'Google OAuth credentials not configured'
      );
    });

    it('should include callback URL in the OAuth URL', () => {
      const result = initiateGoogleOAuth();
      const encodedCallback = encodeURIComponent(
        'http://localhost:3000/api/auth/google/callback'
      );

      expect(result.url).toContain(encodedCallback);
    });
  });

  describe('handleGoogleCallback', () => {
    const mockCode = 'test-auth-code';
    const mockAccessToken = 'mock-access-token';
    const mockEmail = 'test@example.com';
    const mockName = 'Test User';
    const mockUserId = 'user-123';

    beforeEach(() => {
      // Mock successful token exchange
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: mockAccessToken }),
          });
        }
        if (url.includes('www.googleapis.com/oauth2/v2/userinfo')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                email: mockEmail,
                name: mockName,
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('should create a new user if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        role: 'STUDENT',
      });

      const result = await handleGoogleCallback(mockCode);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockEmail,
          role: 'STUDENT',
        },
      });
      expect(result.user.email).toBe(mockEmail);
      expect(result.user.role).toBe(UserRole.STUDENT);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should return existing user if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        role: 'TEACHER',
      });

      const result = await handleGoogleCallback(mockCode);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result.user.email).toBe(mockEmail);
      expect(result.user.role).toBe(UserRole.TEACHER);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error if authorization code is missing', async () => {
      await expect(handleGoogleCallback('')).rejects.toThrow(
        'Authorization code is required'
      );
    });

    it('should throw error if token exchange fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'invalid_grant' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'Failed to exchange authorization code for token'
      );
    });

    it('should throw error if user profile fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: mockAccessToken }),
          });
        }
        if (url.includes('www.googleapis.com/oauth2/v2/userinfo')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'invalid_token' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'Failed to fetch user profile from Google'
      );
    });

    it('should throw error if no email in Google profile', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: mockAccessToken }),
          });
        }
        if (url.includes('www.googleapis.com/oauth2/v2/userinfo')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                name: mockName,
                // No email
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'No email found in Google profile'
      );
    });

    it('should include user name in the result', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        role: 'STUDENT',
      });

      const result = await handleGoogleCallback(mockCode);

      expect(result.user.name).toBe(mockName);
    });

    it('should throw error if OAuth credentials are not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'Google OAuth credentials not configured'
      );
    });
  });
});
