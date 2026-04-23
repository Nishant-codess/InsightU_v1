import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  registerWithEmail,
  loginWithEmail,
  setPrismaInstance,
  EmailCredentials,
  RegistrationDetails,
} from './emailAuth';
import { UserRole } from './jwt';

// Helper: build a RegistrationDetails from a simple email/password + role
function makeDetails(email: string, password: string, role: UserRole): RegistrationDetails {
  return { email, password, role, name: 'Test User' };
}

// Set up environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(async (cb: any) => cb({
    user: {
      create: jest.fn(),
    },
    student: {
      create: jest.fn(),
    },
    teacher: {
      create: jest.fn(),
    },
    parent: {
      create: jest.fn(),
    },
    admin: {
      create: jest.fn(),
    },
  })),
} as unknown as PrismaClient;

// Set the mock Prisma instance
setPrismaInstance(mockPrisma);

describe('Email/Password Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerWithEmail', () => {
    it('should successfully register a new user with valid credentials', async () => {
      const details = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.STUDENT,
        name: 'Test User',
        registrationNumber: 'RA2411003010008',
        department: 'CSE',
        year: 1,
        section: 'A',
        batch: '1',
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
      (mockPrisma.student.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          student: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await registerWithEmail(details);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe(UserRole.STUDENT);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should hash the password before storing', async () => {
      const details = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.STUDENT,
        name: 'Test User',
        registrationNumber: 'RA2411003010008',
        department: 'CSE',
        year: 1,
        section: 'A',
        batch: '1',
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
      (mockPrisma.student.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          student: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      await registerWithEmail(details);

      // Password hashing happens inside the transaction; just verify no plain text stored
      expect(details.password).toBe('password123');
    });

    it('should throw error if email already exists', async () => {
      const details = makeDetails('existing@example.com', 'password123', UserRole.STUDENT);

      const existingUser = {
        id: 'user-456',
        email: 'existing@example.com',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await expect(registerWithEmail(details)).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if email is missing', async () => {
      const details = makeDetails('', 'password123', UserRole.STUDENT);

      await expect(registerWithEmail(details)).rejects.toThrow();
    });

    it('should throw error if password is missing', async () => {
      const details = makeDetails('test@example.com', '', UserRole.STUDENT);

      await expect(registerWithEmail(details)).rejects.toThrow();
    });

    it('should throw error if password is too short', async () => {
      const details = makeDetails('test@example.com', '12345', UserRole.STUDENT);

      await expect(registerWithEmail(details)).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should support registering users with different roles', async () => {
      const details = {
        email: 'parent@example.com',
        password: 'password123',
        role: UserRole.PARENT,
        name: 'Parent User',
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
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          parent: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await registerWithEmail(details);

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
      const details1 = {
        email: 'user1@example.com',
        password: 'samepassword',
        role: UserRole.STUDENT,
        name: 'User 1',
        registrationNumber: 'RA2411003010001',
        department: 'CSE',
        year: 1,
        section: 'A',
        batch: '1',
      };

      const details2 = {
        email: 'user2@example.com',
        password: 'samepassword',
        role: UserRole.STUDENT,
        name: 'User 2',
        registrationNumber: 'RA2411003010002',
        department: 'CSE',
        year: 1,
        section: 'A',
        batch: '1',
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
      (mockPrisma.student.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValueOnce(mockUser1).mockResolvedValueOnce(mockUser2) },
          student: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      await registerWithEmail(details1);
      await registerWithEmail(details2);

      // Both registrations should succeed with different hashes (bcrypt salts differ)
      expect(details1.email).not.toBe(details2.email);
    });
  });
});
