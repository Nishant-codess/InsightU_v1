import fc from 'fast-check';
import { getStudentDashboard } from '../analytics/performance';
import { getStudentTimetable, uploadTimetable } from './timetable';
import prisma from '../../config/database';

jest.mock('../../config/database', () => {
    let timetables: any[] = [];
    
    return {
      __esModule: true,
      default: {
        student: {
          findUnique: jest.fn(async ({ where }) => {
            if (where.id === 'student-1') return { id: 'student-1', year: 2, batch: 1, department: 'CS' };
            if (where.id === 'student-unknown') return { id: 'student-unknown', year: 3, batch: 2, department: 'IT' };
            return null;
          }),
        },
        studentPerformance: {
          findMany: jest.fn(async () => [
            { subject: 'Math', topic: 'Algebra', score: 30, maxScore: 100 },  // 30% Weak Topic + Weak Subject
            { subject: 'Math', topic: 'Calculus', score: 90, maxScore: 100 }, // Health recovery
            { subject: 'Physics', topic: 'Motion', score: 20, maxScore: 100 },// 20% Weak
          ]),
        },
        notification: {
           create: jest.fn(),
        },
        timetable: {
          create: jest.fn(async ({ data }) => {
            timetables.push(data);
            return data;
          }),
          findFirst: jest.fn(async ({ where }) => timetables.find(t => t.year === where.year && t.batch === where.batch)),
        },
        _store: { timetables }
      },
    };
});

describe('Feature: insightu-platform, Analytics & Timetables', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (prisma as any)._store.timetables.length = 0;
    });

    it('Property: Analytics correctly isolates weak topics and calculates health scores', async () => {
        const dashboard = await getStudentDashboard('student-1');
        
        // Total Earned: 30+90+20 = 140. Total Max: 300. Score: 46.66..% -> Triggers below 55% alert
        expect(dashboard.academicHealthScore).toBeCloseTo(46.66, 1);
        
        // Weak Subjects (< 60%) => Math (120/200 = 60%), Physics (20/100 = 20%). Only Physics is strictly < 60! 
        // Note Math is EXACTLY 60% so shouldn't trip strict `< 60` 
        expect(dashboard.weakSubjects).toContain('Physics');
        
        // Weak Topics (< 50%) => Algebra (30%), Motion (20%)
        const weakTopicNames = dashboard.weakTopics.map(t => t.topic);
        expect(weakTopicNames).toContain('Algebra');
        expect(weakTopicNames).toContain('Motion');
        expect(dashboard.recommendations.length).toBe(2);
        
        // Notification triggered for falling below Health Score 55 boundary
        expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('Property: Timetables serve constraints based on batch and year mappings', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(1, 2),
                async (batch) => {
                    jest.clearAllMocks();
                    (prisma as any)._store.timetables.length = 0;

                    // Mock upload
                    await uploadTimetable({ year: 2, batch }, { originalname: 'time.pdf', mimetype: 'application/pdf' } as any);
                    
                    // Retrieve for matching student profile
                    // 'student-1' is mocked to batch 1 
                    const data = await getStudentTimetable('student-1');
                    
                    if (batch === 1) {
                        expect(data.currentDayOrder).toBeDefined();
                    } else {
                        // Because timeline was uploaded for Batch 2 but student-1 is Batch 1
                        expect(data.message).toBeDefined();
                    }
                }
            )
        )
    });

    it('Property: Unmapped Year classes see fallback message directly per rule 13.2', async () => {
        // 'student-unknown' is year 3
        const result = await getStudentTimetable('student-unknown');
        expect(result.message).toBe("Timetable not available yet. Please ask the admin to upload timetable.");
    });
});
