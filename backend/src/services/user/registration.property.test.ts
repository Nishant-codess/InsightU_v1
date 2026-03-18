import fc from 'fast-check';
import { registerStudent, registerParent, StudentRegistrationData, ParentRegistrationData } from './registration';
import prisma from '../../config/database';
import { computeGroup } from '../../utils/validation';

// Mock Prisma
jest.mock('../../config/database', () => {
  return {
    __esModule: true,
    default: {
      user: { findUnique: jest.fn(), create: jest.fn() },
      student: { create: jest.fn() },
      teacher: { create: jest.fn() },
      parent: { create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb({
        user: { create: jest.fn().mockResolvedValue({ id: 'mock-user-id' }) },
        student: { create: jest.fn().mockResolvedValue({ id: 'mock-student-id' }) },
        teacher: { create: jest.fn().mockResolvedValue({ id: 'mock-teacher-id' }) },
        parent: { create: jest.fn().mockResolvedValue({ id: 'mock-parent-id' }) },
      })),
    },
  };
});

describe('Feature: insightu-platform, Registration properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 10, 11, 12: should enforce student constraints (year, section, batch)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 50 }),
        fc.string({ minLength: 2 }), // name
        fc.string({ minLength: 2 }), // dept
        fc.integer(), // year
        fc.string({ minLength: 1, maxLength: 5 }), // section
        fc.integer(), // batch
        fc.emailAddress(), // college email
        async (email, password, name, department, year, section, batch, collegeMailId) => {
          (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

          const data: StudentRegistrationData = {
            email, password, name, department, year, section, batch, collegeMailId,
            registrationNumber: 'RA12345' // Valid
          };

          const isYearValid = year >= 1 && year <= 4;
          const isSectionValid = /^[A-Z]$/.test(section);
          const isBatchValid = batch >= 1 && batch <= 2;

          try {
            await registerStudent(data);
            expect(isYearValid).toBe(true);
            expect(isSectionValid).toBe(true);
            expect(isBatchValid).toBe(true);
          } catch (e: any) {
            if (!isYearValid) expect(e.message).toContain('Year must be');
            else if (!isSectionValid) expect(e.message).toContain('Section must be');
            else if (!isBatchValid) expect(e.message).toContain('Batch must be');
            else throw e; // shouldn't fail if all are valid
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 9: Registration number format validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(), 
        async (regNum) => {
          (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
          const data: StudentRegistrationData = {
            email: 'test@example.com',
            name: 'Test',
            department: 'CS',
            year: 1,
            section: 'A',
            batch: 1,
            collegeMailId: 'test.col@example.com',
            registrationNumber: regNum
          };

          const isValid = /^RA\d+$/.test(regNum);

          try {
            await registerStudent(data);
            expect(isValid).toBe(true);
          } catch (e: any) {
            if (!isValid) expect(e.message).toContain('RA');
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 13: Group computation', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 1 }), // single char
        fc.integer(),
        (section, batch) => {
          expect(computeGroup(section, batch)).toBe(`${section}${batch}`);
        }
      )
    );
  });

  it('Property 3: Parent registration enforces email/password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string(), // password
        async (email, password) => {
          (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
          const data: ParentRegistrationData = { email, password, name: 'Parent' };

          const hasValidPwd = password && password.length >= 6;

          try {
            await registerParent(data);
            expect(hasValidPwd).toBe(true);
          } catch (e: any) {
            if (!hasValidPwd) expect(e.message).toMatch(/(required|at least 6 characters)/);
            else throw e;
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
