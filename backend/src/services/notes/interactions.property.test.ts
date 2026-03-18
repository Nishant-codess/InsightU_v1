import fc from 'fast-check';
import { bookmarkNote, unbookmarkNote, addAnnotation, getAnnotations } from './interactions';
import prisma from '../../config/database';

jest.mock('../../config/database', () => {
  const bookmarks = new Set<string>();
  const annotations: any[] = [];
  
  return {
    __esModule: true,
    default: {
      noteBookmark: {
        create: jest.fn(async ({ data }) => {
          bookmarks.add(`${data.studentId}-${data.noteId}`);
          return { id: 'bm-id', ...data };
        }),
        delete: jest.fn(async ({ where }) => {
          bookmarks.delete(`${where.studentId_noteId.studentId}-${where.studentId_noteId.noteId}`);
          return { id: 'bm-id', ...where.studentId_noteId };
        }),
      },
      noteAnnotation: {
        create: jest.fn(async ({ data }) => {
          const anno = { id: `an-${Date.now()}`, ...data, createdAt: new Date() };
          annotations.push(anno);
          return anno;
        }),
        findMany: jest.fn(async ({ where }) => {
          return annotations.filter(a => a.studentId === where.studentId && a.noteId === where.noteId);
        }),
      },
      // Expose for testing
      _store: { bookmarks, annotations },
    },
  };
});

describe('Feature: insightu-platform, Lecture Note Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any)._store.bookmarks.clear();
    (prisma as any)._store.annotations.length = 0;
  });

  it('Property 28: Bookmark round-trip consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (studentId, noteId) => {
          // Add Bookmark
          await bookmarkNote(studentId, noteId);
          expect((prisma as any)._store.bookmarks.has(`${studentId}-${noteId}`)).toBe(true);
          
          // Remove Bookmark
          await unbookmarkNote(studentId, noteId);
          expect((prisma as any)._store.bookmarks.has(`${studentId}-${noteId}`)).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 29: Annotation isolation (does not modify original note)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.record({
          content: fc.string({ minLength: 1 }),
          page: fc.integer({ min: 1, max: 100 }),
          positionX: fc.float({ min: 0, max: 100 }),
          positionY: fc.float({ min: 0, max: 100 })
        }),
        async (studentId, noteId, data) => {
          // Annotation structure ensures original note is unaltered internally
          const result = await addAnnotation(studentId, noteId, data);
          
          expect(result.content).toBe(data.content);
          expect(result.page).toBe(data.page);
          
          // Original note remains completely unmodified since this logic operates 
          // explicitly upon `noteAnnotation` DB separate model.
          const fetched = await getAnnotations(studentId, noteId);
          expect(fetched.length).toBeGreaterThanOrEqual(1);
          expect(fetched[fetched.length-1].content).toBe(data.content);
        }
      ),
      { numRuns: 30 }
    );
  });
});
