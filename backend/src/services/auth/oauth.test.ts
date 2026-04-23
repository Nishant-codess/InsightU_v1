import { initiateGoogleOAuth, handleGoogleCallback, setPrismaInstance } from './oauth';
import { UserRole } from './jwt';

// Mock axios at the top level before importing oauth
jest.mock('axios');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockAxios = require('axios');

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

    setPrismaInstance(mockPrisma as any);
    jest.clearAllMocks();

    // Set up environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

    // Setup axios mocks
    mockAxios.post = jest.fn();
    mockAxios.get = jest.fn();
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
      // Mock successful token exchange via axios
      (mockAxios.post as jest.Mock).mockResolvedValue({
        data: { access_token: mockAccessToken },
      });
      (mockAxios.get as jest.Mock).mockResolvedValue({
        data: { email: mockEmail, name: mockName },
      });
    });

    it('should return needsProfile when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await handleGoogleCallback(mockCode);

      expect(result.needsProfile).toBe(true);
      expect(result.profile?.email).toBe(mockEmail);
      expect(result.profile?.name).toBe(mockName);
    });

    it('should return existing user with tokens if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        role: 'TEACHER',
        student: null,
        teacher: { name: mockName },
        parent: null,
        admin: null,
      });

      const result = await handleGoogleCallback(mockCode);

      expect(result.user!.email).toBe(mockEmail);
      expect(result.user!.role).toBe(UserRole.TEACHER);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error if authorization code is missing', async () => {
      await expect(handleGoogleCallback('')).rejects.toThrow(
        'Authorization code is required'
      );
    });

    it('should throw error if token exchange fails', async () => {
      (mockAxios.post as jest.Mock).mockRejectedValue(
        new Error('Request failed with status code 400')
      );

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'OAuth callback failed'
      );
    });

    it('should throw error if user profile fetch fails', async () => {
      (mockAxios.post as jest.Mock).mockResolvedValue({
        data: { access_token: mockAccessToken },
      });
      (mockAxios.get as jest.Mock).mockRejectedValue(
        new Error('Request failed with status code 401')
      );

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'OAuth callback failed'
      );
    });

    it('should throw error if no email in Google profile', async () => {
      (mockAxios.post as jest.Mock).mockResolvedValue({
        data: { access_token: mockAccessToken },
      });
      (mockAxios.get as jest.Mock).mockResolvedValue({
        data: { name: mockName }, // No email
      });

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'No email found in Google profile'
      );
    });

    it('should include user name in the result for existing users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        role: 'STUDENT',
        student: { name: mockName },
        teacher: null,
        parent: null,
        admin: null,
      });

      const result = await handleGoogleCallback(mockCode);

      expect(result.user!.name).toBe(mockName);
    });

    it('should throw error if OAuth credentials are not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      await expect(handleGoogleCallback(mockCode)).rejects.toThrow(
        'Google OAuth credentials not configured'
      );
    });
  });
});
