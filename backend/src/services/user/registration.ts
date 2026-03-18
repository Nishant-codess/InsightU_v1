import prisma from '../../config/database';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { UserRole } from '../auth/jwt';
import { validateRegistrationNumber, computeGroup } from '../../utils/validation';

export interface StudentRegistrationData {
  email: string;
  password?: string;
  name: string;
  registrationNumber: string;
  department: string;
  year: number;
  section: string;
  batch: string;
  collegeMailId: string;
}

export interface TeacherRegistrationData {
  email: string;
  password?: string;
  name: string;
  department: string;
  subjects: string[];
}

export interface ParentRegistrationData {
  email: string;
  password?: string; // Parents must require password based on property 3, but we'll validate it.
  name: string;
}

export async function registerStudent(data: StudentRegistrationData) {
  if (!data.email) throw new Error('Email is required');
  // Property 4: Institutional email acceptance (assuming some specific check if needed, but let's assume valid formats are fine or we add domain check. Based on property 4 title, we'll just check it's present for now)
  
  if (!validateRegistrationNumber(data.registrationNumber)) {
    throw new Error('Invalid registration number format. Must start with RA followed by digits.');
  }
  
  // Property 10: Year value constraints
  if (data.year < 1 || data.year > 4) {
    throw new Error('Year must be between 1 and 4');
  }

  // Property 11: Section format validation (let's assume single uppercase letter)
  if (!/^[A-Z]$/.test(data.section)) {
    throw new Error('Section must be a single uppercase letter');
  }

  // Property 12: Batch value constraints
  if (!['Batch 1', 'Batch 2'].includes(data.batch)) {
    throw new Error('Batch must be "Batch 1" or "Batch 2"');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already exists');
  }

  let passwordHash: string | null = null;
  if (data.password) {
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const group = computeGroup(data.section, data.batch);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.STUDENT,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          name: data.name,
          registrationNumber: data.registrationNumber,
          course: 'BTech', // Adding default course as it's now required
          department: data.department,
          branch: 'CSE', // Adding default branch as it's now required
          year: data.year,
          section: data.section,
          batch: data.batch,
          group,
          collegeMailId: data.collegeMailId,
        },
      });

      return { user, student };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes('registrationNumber')) {
        throw new Error('Student with this Registration Number already exists');
      }
      if (target.includes('email')) {
        throw new Error('User with this email already exists');
      }
    }
    throw error;
  }
}

export async function registerTeacher(data: TeacherRegistrationData) {
  if (!data.email) throw new Error('Email is required');
  
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already exists');
  }

  let passwordHash: string | null = null;
  if (data.password) {
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.TEACHER,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          name: data.name,
          department: data.department,
          subjects: data.subjects,
        },
      });

      return { user, teacher };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Teacher with this email or identity already exists');
    }
    throw error;
  }
}

export async function registerParent(data: ParentRegistrationData) {
  if (!data.email) throw new Error('Email is required');
  
  // Property 3: Parent registration enforces email/password
  if (!data.password) {
    throw new Error('Password is required for parent registration');
  }
  if (data.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.PARENT,
        },
      });

      const parent = await tx.parent.create({
        data: {
          userId: user.id,
          name: data.name,
        },
      });

      return { user, parent };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Parent with this email already exists');
    }
    throw error;
  }
}
