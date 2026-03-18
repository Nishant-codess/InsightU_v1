import fc from 'fast-check';
import { uploadAssignment, uploadAssignmentMarks, AssignmentMetadata } from './assignments';
import prisma from '../../config/database';

jest.mock('../../config/database', () => {
  const assignments: any[] = [];
  const performances: any[] = [];
  
  return {
    __esModule: true,
    default: {
      assignment: {
        create: jest.fn(async ({ data }) => {
          const assignment = { id: `asgn-${Date.now()}`, ...data };
          assignments.push(assignment);
          return assignment;
        }),
        findUnique: jest.fn(async ({ where }) => assignments.find(a => a.id === where.id) || null),
      },
      notification: {
        createMany: jest.fn(),
      },
      studentPerformance: {
        createMany: jest.fn(async ({ data }) => {
          performances.push(...data);
          return { count: data.length };
        }),
      },
      _store: { assignments, performances },
    },
  };
});

describe('Feature: insightu-platform, Assignment Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any)._store.assignments.length = 0;
    (prisma as any)._store.performances.length = 0;
  });

  it('Property: Upload assignment requires valid metadata and triggers notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.date(),
        fc.integer({ min: 10, max: 100 }),
        fc.boolean(), // metadata valid boolean
        async (teacherId, subject, topic, title, dueDate, maxMarks, isValid) => {
          const metadata: AssignmentMetadata = {
            teacherId,
            subject: isValid ? subject : '',
            topic: isValid ? topic : '',
            title: isValid ? title : '',
            description: 'Test',
            dueDate: isValid ? dueDate : null as any,
            maxMarks: isValid ? maxMarks : null as any,
          };
          
          try {
            const assignment = await uploadAssignment(metadata);
            expect(isValid).toBe(true);
            expect(assignment.topic).toBe(topic);
            
            // Req 16.3 / 15.3 mapping -> notifications triggered
            expect(prisma.notification.createMany).toHaveBeenCalled();
          } catch (e: any) {
             if (!isValid) {
               expect(e.message).toContain('Missing required metadata');
             } else {
               throw e;
             }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property: Marking limits logic and analytics injection map constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 10, max: 100 }), // Max Marks Base
        fc.array(fc.record({ id: fc.uuid(), scoreOffset: fc.integer({ min: -50, max: 150 }) }), { minLength: 1, maxLength: 5 }),
        async (teacherId, maxMarks, studentsGen) => {
          // Setup a valid assignment document
          const metadata: AssignmentMetadata = {
            teacherId, subject: 'CS101', topic: 'Intro', title: 'Asgn 1', description: 'Test', dueDate: new Date(), maxMarks
          };
          const assignment = await uploadAssignment(metadata);
          
          const marksInput = studentsGen.map(s => ({
             studentId: s.id,
             // The scoreOffset forces boundaries (negative, normal, over limit bounds)
             score: s.scoreOffset
          }));
          
          const allScoresValid = marksInput.every(m => m.score >= 0 && m.score <= maxMarks);

          if (allScoresValid) {
            await uploadAssignmentMarks(assignment.id, marksInput);
            
            // Should integrate with Analytics 16.4 & 16.5
            expect(prisma.studentPerformance.createMany).toHaveBeenCalledWith(
              expect.objectContaining({
                  data: expect.arrayContaining([
                      expect.objectContaining({ assessmentType: 'ASSIGNMENT', subject: 'CS101', topic: 'Intro' })
                  ])
              })
            );
          } else {
            // Because at least 1 is invalid, it should inherently throw
            await expect(uploadAssignmentMarks(assignment.id, marksInput))
                  .rejects.toThrow('out of bounds');
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
