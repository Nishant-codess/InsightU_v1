import { linkStudentToParent, getStudentDashboardForParent } from './parent';
import { getPlatformAnalytics, modifyUserRole } from './admin';
import prisma from '../../config/database';

jest.mock('../../config/database', () => {
    let parentLinks: any[] = [];
    let users = [{ id: 'user-t', role: 'STUDENT' }, { id: 'admin-user-id', role: 'ADMIN' }];
    
    return {
      __esModule: true,
      default: {
        parent: {
          findUnique: jest.fn(async ({ where }) => {
            if (where.id === 'parent-valid') return { id: 'parent-valid' };
            return null;
          }),
        },
        student: {
            findUnique: jest.fn(async ({ where }) => {
               if (where.registrationNumber === 'RA-VALID') return { id: 'student-id' };
               if (where.id === 'student-id') return { id: 'student-id' };
               return null;
            }),
            count: jest.fn(async () => 50)
        },
        parentStudent: {
          create: jest.fn(async ({ data }) => {
            parentLinks.push(data);
            return data;
          }),
          findUnique: jest.fn(async ({ where }) => parentLinks.find(pl => pl.parentId === where.parentId_studentId.parentId && pl.studentId === where.parentId_studentId.studentId)),
        },
        admin: {
            findUnique: jest.fn(async ({ where }) => {
                if(where.id === 'admin-valid') return { id: 'admin-valid', userId: 'admin-user-id' }
                return null;
            })
        },
        user: {
            update: jest.fn(async ({ where, data }) => {
                const u = users.find(x => x.id === where.id);
                if (u) u.role = data.role;
                return u;
            }),
            count: jest.fn(async () => 100)
        },
        teacher: { count: jest.fn(async () => 10) },
        quizSession: { count: jest.fn(async () => 2) },
        lectureNote: { count: jest.fn(async () => 300) },
        
        studentPerformance: { findMany: jest.fn(async () => []) },
        _store: { parentLinks, users }
      },
    };
});

describe('Feature: insightu-platform, Roles Scoping (Parents & Admins)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (prisma as any)._store.parentLinks.length = 0;
        (prisma as any)._store.users[0].role = 'STUDENT';
    });

    it('Property: Parents can only fetch analytics for implicitly linked student accounts', async () => {
        // Link creation bounds (Req 11.1)
        await linkStudentToParent('parent-valid', 'RA-VALID');
        
        // Allowed Link logic Map (Req 11.3 + 11.4)
        const dashboard = await getStudentDashboardForParent('parent-valid', 'student-id');
        expect(dashboard).toBeDefined();

        // Security Disallowed mapped test
        await expect(getStudentDashboardForParent('parent-valid', 'student-unlinked'))
             .rejects.toThrow('Unauthorized: Student is not linked');
    });

    it('Property: Admins can modify capabilities barring themselves and fetch metrics', async () => {
        // Platform Analytics mapping (Req 14.3)
        const analytics = await getPlatformAnalytics('admin-valid');
        expect(analytics.metrics.students).toBe(50);
        expect(analytics.engagement.liveQuizzes).toBe(2);

        // Security modify bounds (Req 14.4)
        await modifyUserRole('admin-valid', 'user-t', 'TEACHER' as any);
        expect((prisma as any)._store.users[0].role).toBe('TEACHER');

        // Can't modify self restriction logically
        await expect(modifyUserRole('admin-valid', 'admin-user-id', 'STUDENT' as any))
              .rejects.toThrow('Admins cannot change their own role');
    });
});
