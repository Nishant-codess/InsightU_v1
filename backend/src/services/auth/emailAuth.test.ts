import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
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

describe('Email/Password Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerWithEmail', () => {
    it('should successfully register a new user with valid credentials', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await registerWithEmail(credentials, UserRole.STUDENT);

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe(UserRole.STUDENT);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await registerWithEmail(credentials, UserRole.STUDENT);

      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      const storedPasswordHash = createCall.data.passwordHash;

      // Verify that the stored password is hashed and not plain text
      expect(storedPasswordHash).not.toBe('password123');
      expect(storedPasswordHash).toBeDefined();
      expect(typeof storedPasswordHash).toBe('string');
    });

    it('should throw error if email already exists', async () => {
      const credentials: EmailCredentials = {
        email: 'existing@example.com',
        password: 'password123',
      };

      const existingUser = {
        id: 'user-456',
        email: 'existing@example.com',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await expect(
        registerWithEmail(credentials, UserRole.STUDENT)
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if email is missing', async () => {
      const credentials: EmailCredentials = {
        email: '',
        password: 'password123',
      };

      await expect(
        registerWithEmail(credentials, UserRole.STUDENT)
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error if password is missing', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: '',
      };

      await expect(
        registerWithEmail(credentials, UserRole.STUDENT)
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error if password is too short', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: '12345',
      };

      await expect(
        registerWithEmail(credentials, UserRole.STUDENT)
      ).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should support registering users with different roles', async () => {
      const credentials: EmailCredentials = {
        email: 'parent@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-789',
        email: 'parent@example.com',
        passwordHash: 'hashed-password',
        role: 'PARENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await registerWithEmail(credentials, UserRole.PARENT);

      expect(result.user.role).toBe(UserRole.PARENT);
    });
  });

  describe('loginWithEmail', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await loginWithEmail(credentials);

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe(UserRole.STUDENT);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error if user does not exist', async () => {
      const credentials: EmailCredentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(loginWithEmail(credentials)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error if password is incorrect', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(loginWithEmail(credentials)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error if user has no password hash (OAuth user)', async () => {
      const credentials: EmailCredentials = {
        email: 'oauth@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'oauth@example.com',
        passwordHash: null,
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(loginWithEmail(credentials)).rejects.toThrow(
        'This account uses OAuth authentication. Please login with Google.'
      );
    });

    it('should throw error if email is missing', async () => {
      const credentials: EmailCredentials = {
        email: '',
        password: 'password123',
      };

      await expect(loginWithEmail(credentials)).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should throw error if password is missing', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: '',
      };

      await expect(loginWithEmail(credentials)).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should verify password using bcrypt.compare', async () => {
      const credentials: EmailCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await loginWithEmail(credentials);

      // If we get here without error, bcrypt.compare worked correctly
      expect(result.user.id).toBe('user-123');
    });
  });

  describe('Password Security', () => {
    it('should create different hashes for the same password', async () => {
      const credentials1: EmailCredentials = {
        email: 'user1@example.com',
        password: 'samepassword',
      };

      const credentials2: EmailCredentials = {
        email: 'user2@example.com',
        password: 'samepassword',
      };

      const mockUser1 = {
        id: 'user-1',
        email: 'user1@example.com',
        passwordHash: 'hash1',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser2 = {
        id: 'user-2',
        email: 'user2@example.com',
        passwordHash: 'hash2',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock)
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);

      await registerWithEmail(credentials1, UserRole.STUDENT);
      await registerWithEmail(credentials2, UserRole.STUDENT);

      const createCall1 = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      const createCall2 = (mockPrisma.user.create as jest.Mock).mock.calls[1][0];

      const hash1 = createCall1.data.passwordHash;
      const hash2 = createCall2.data.passwordHash;

      // Hashes should be different due to different salts
      expect(hash1).not.toBe(hash2);
    });
  });
});
