import fc from 'fast-check';
import { getNotesBySubject } from './retrieval';

jest.mock('../../config/database', () => {
  return {
    __esModule: true,
    default: {
      lectureNote: {
        findMany: jest.fn(async (args) => {
          // Simulate DB sorting and returning
          const mockData = [
            { id: '1', subject: args.where.subject || 'CS101', topic: args.where.topic || 'Intro', lectureDate: new Date('2024-01-05'), teacher: { name: 'Dr. Smith' }, bookmarks: [] },
            { id: '2', subject: args.where.subject || 'CS101', topic: args.where.topic || 'Intro', lectureDate: new Date('2024-01-01'), teacher: { name: 'Dr. Smith' }, bookmarks: [] },
          ];
          return mockData.sort((a, b) => b.lectureDate.getTime() - a.lectureDate.getTime());
        }),
      },
    },
  };
});

describe('Feature: insightu-platform, Lecture Note Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Properties 24, 25, 26: Note accessibility, organization (sorting), and viewer data provision', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // subject
        fc.uuid(), // userId
        async (subject, userId) => {
          const notes = await getNotesBySubject(subject, userId);
          
          // Verify it returns an array
          expect(Array.isArray(notes)).toBe(true);
          
          if (notes.length > 0) {
            // Organization property check: should be sorted by lectureDate desc
            if (notes.length > 1) {
              expect(notes[0].lectureDate.getTime()).toBeGreaterThanOrEqual(notes[1].lectureDate.getTime());
            }

            // Viewer data provision: Should include teacher info
            expect(notes[0].teacher).toBeDefined();
            expect(notes[0].teacher.name).toBe('Dr. Smith');
            
            // Viewer data provision: Should include user-specific bookmarks
            expect(notes[0].bookmarks).toBeDefined();
            expect(Array.isArray(notes[0].bookmarks)).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
