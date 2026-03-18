import fc from 'fast-check';
import { uploadExamSettings, processExamMarksCsv, ExamMetadata } from './exams';
import prisma from '../../config/database';

jest.mock('../../config/database', () => {
    const exams: any[] = [];
    const performances: any[] = [];
    
    return {
      __esModule: true,
      default: {
        exam: {
          create: jest.fn(async ({ data }) => {
            const exam = { id: `exam-${Date.now()}`, ...data };
            exams.push(exam);
            return exam;
          }),
          findUnique: jest.fn(async ({ where }) => exams.find(e => e.id === where.id) || null),
        },
        student: {
            findUnique: jest.fn(async ({ where }) => {
                if (where.registrationNumber === 'RA123') return { id: 'student-1', registrationNumber: 'RA123' };
                if (where.registrationNumber === 'RA456') return { id: 'student-2', registrationNumber: 'RA456' };
                return null;
            })
        },
        studentExamMarks: {
            create: jest.fn(async () => ({ id: 'mark-id' })),
        },
        studentPerformance: {
          createMany: jest.fn(async ({ data }) => {
            performances.push(...data);
            return { count: data.length };
          }),
        },
        _store: { exams, performances },
      },
    };
});

describe('Feature: insightu-platform, Exam Marks Integration', () => {
   beforeEach(() => {
     jest.clearAllMocks();
     (prisma as any)._store.exams.length = 0;
     (prisma as any)._store.performances.length = 0;
   });

   it('Property: Process CSV correctly matches student accounts and injects logic to Analytics', async () => {
        // Mock a basic CSV payload matching Req 9
        const csvContent = Buffer.from(
            "RegistrationNumber,Q1,Q2,Q3\nRA123,10,15,5\nRA456,8,12,4\nRA999,0,0,0\n"
        );
        
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1 }),
                async (teacherId, subject) => {
                    jest.clearAllMocks();
                    (prisma as any)._store.exams.length = 0;
                    (prisma as any)._store.performances.length = 0;

                    const metadata: ExamMetadata = {
                        teacherId,
                        subject,
                        examName: 'Midterm',
                        examDate: new Date(),
                        totalMarks: 30, // 10 + 15 + 5
                        questions: [
                            { qNo: 1, topic: 'Arrays', maxMarks: 10 },
                            { qNo: 2, topic: 'Trees', maxMarks: 15 },
                            { qNo: 3, topic: 'Graphs', maxMarks: 5 }
                        ]
                    };
                    
                    const exam = await uploadExamSettings(metadata);
                    
                    const result: any = await processExamMarksCsv(exam.id, csvContent);
                    
                    // Req 9.5: Unmatched skip parsing rather than fatal crash
                    expect(result.unmatchedRegistrations).toContain('RA999');
                    expect(result.stats.failed).toBe(1);
                    expect(result.stats.processed).toBe(2);
                    
                    // Req 9.6 & 16.4: Integrate with analytics directly mapped to topic scope
                    expect(prisma.studentExamMarks.create).toHaveBeenCalledTimes(2);
                    expect(prisma.studentPerformance.createMany).toHaveBeenCalledTimes(2); // Two arrays (1 per matched student passed separately in the loop)
                }
            ),
            { numRuns: 10 }
        );
   });
});
