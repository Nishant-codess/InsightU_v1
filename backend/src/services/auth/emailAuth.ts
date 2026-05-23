import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { generateTokens, UserRole } from './jwt';

let _prismaOverride: any = null;

export function getPrismaInstance() {
  return _prismaOverride || prisma;
}

// For testing purposes — allows injecting a mock Prisma client
export function setPrismaInstance(instance: any): void {
  _prismaOverride = instance;
}

/** Simple email/password credentials used by tests */
export interface EmailCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    student?: any;
    teacher?: any;
    parent?: any;
  };
  accessToken: string;
  refreshToken: string;
  portalData?: any;
}

// Number of salt rounds for bcrypt hashing
const SALT_ROUNDS = 10;

export interface RegistrationDetails {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  registrationNumber?: string;
  course?: string;
  department?: string;
  branch?: string;
  year?: number;
  section?: string;
  batch?: string;
  group?: string;
  collegeMailId?: string;
}

/**
 * Register a new user with email and password and create their profile
 */
export async function registerWithEmail(
  details: RegistrationDetails
): Promise<AuthResult> {
  const { email, password, role, name, ...profileData } = details;

  // Validate input
  if (!email || !password || !role || !name) {
    throw new Error('Email, password, role, and name are required');
  }

  // Early check for JWT secrets to avoid partial registration
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured on server. Please contact administrator.');
  }

  // Strong password validation
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }

  const prisma = getPrismaInstance();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // If student, check if registration number already exists
  if (role === 'STUDENT' && profileData.registrationNumber) {
    const existingStudent = await prisma.student.findUnique({
      where: { registrationNumber: profileData.registrationNumber },
    });
    if (existingStudent) {
      throw new Error('Student with this Registration Number already exists. Please try logging in.');
    }
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Use a transaction to ensure both user and profile are created
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      // Create the profile based on the role
      switch (role) {
        case 'STUDENT':
          if (!profileData.registrationNumber) throw new Error('Registration number is required for students');
          await tx.student.create({
            data: {
              userId: user.id,
              name,
              registrationNumber: profileData.registrationNumber,
              course: profileData.course || 'BTech',
              department: profileData.department || 'Unknown',
              branch: profileData.branch || 'Unknown',
              year: profileData.year || 1,
              section: `${profileData.section || 'A'}${ (profileData.batch || 'Batch 1').includes('1') ? '1' : '2' }`,
              batch: profileData.batch || 'Batch 1',
              group: profileData.group || 'G1',
              collegeMailId: profileData.collegeMailId || email,
            },
          });
          break;
        case 'TEACHER':
          await tx.teacher.create({
            data: {
              userId: user.id,
              name,
              department: profileData.department || 'Unknown',
            },
          });
          break;
        case 'PARENT' as any: {
          // Parent profile creation handled separately
          break;
        }
        case 'ADMIN':
          await tx.admin.create({
            data: {
              userId: user.id,
              name,
            },
          });
          break;
      }

      return user;
    });

    // Generate JWT tokens
    const tokens = generateTokens(result.id, result.role as UserRole, result.email);

    return {
      user: {
        id: result.id,
        email: result.email,
        role: result.role as UserRole,
        name,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    // Handle Prisma unique constraint violations explicitly
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('email')) {
          throw new Error('User with this email already exists');
        }
        if (target.includes('registrationNumber')) {
          throw new Error('Student with this Registration Number already exists');
        }
      }
    }
    // Re-throw if it's already an error we handled/threw
    if (error instanceof Error) throw error;
    throw new Error('Registration failed. Please try again.');
  }
}

/**
 * Login with email and password
 * @param credentials - Email and password credentials
 * @returns AuthResult with user data and tokens
 * @throws Error if credentials are invalid
 */
export async function loginWithEmail(
  credentials: { email: string; password: string }
): Promise<AuthResult> {
  const { email, password } = credentials;

  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const prisma = getPrismaInstance();

  // Find user by email with their profile
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: true,
      teacher: true,
      admin: true,
      parent: true,
    },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user has a password hash (not OAuth user)
  if (!user.passwordHash) {
    throw new Error('This account uses OAuth authentication. Please login with Google.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Get name from profile
  const name = user.student?.name || user.teacher?.name || user.admin?.name || user.parent?.name;

  let portalData = null;
  if (user.role === 'PARENT' && user.parent?.childSrmEmail) {
    const childUser = await prisma.user.findUnique({
      where: { email: user.parent.childSrmEmail },
      include: {
        student: {
          include: { portalData: true }
        }
      }
    });
    if (childUser?.student?.portalData) {
      portalData = childUser.student.portalData;
      // Inject some child profile info into portalData to avoid undefined in parent dashboard
      portalData.profile = {
         name: childUser.student.name,
         registrationNumber: childUser.student.registrationNumber,
         department: childUser.student.department,
         program: childUser.student.course,
         batch: childUser.student.batch,
         semester: childUser.student.year * 2 + '' // approximation
      };
    }
  }

  // Generate JWT tokens
  const tokens = generateTokens(user.id, user.role as UserRole, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      name,
      student: user.student,
      teacher: user.teacher,
      parent: user.parent,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    portalData,
  };
}
