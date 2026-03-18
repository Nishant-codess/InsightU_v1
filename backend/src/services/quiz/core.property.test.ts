import fc from 'fast-check';
import { createQuiz, startQuizSession, QuizData, QuizQuestion } from './core';
import prisma from '../../config/database';
import redisClient from '../../config/redis';

jest.mock('../../config/database', () => {
  const codes = new Set<string>();
  return {
    __esModule: true,
    default: {
      quiz: {
        create: jest.fn(async ({ data }) => {
          return { id: `quiz-${Date.now()}`, ...data };
        }),
      },
      quizSession: {
        create: jest.fn(async ({ data }) => {
          if (codes.has(data.sessionCode)) throw new Error('Unique constraint failed');
          codes.add(data.sessionCode);
          return { id: `session-${Date.now()}`, ...data };
        })
      },
      _store: { codes },
    },
  };
});

jest.mock('../../config/redis', () => {
  let store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      set: jest.fn(async (key: string, val: string) => store.set(key, val)),
      _store: store,
    }
  };
});

// Mock qrcode internally
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockcode'),
}));

describe('Feature: insightu-platform, Quiz Core functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any)._store.codes.clear();
    (redisClient as any)._store.clear();
  });

  it('Property 31: Quiz question validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 10, max: 60 }),
        fc.array(
          fc.record({
            question: fc.string(),
            options: fc.array(fc.string(), { minLength: 0, maxLength: 5 }), // intentionally sometimes invalid (< 2)
            correctAnswerIndex: fc.integer({ min: -1, max: 5 }), // intentionally sometimes invalid bounds
            topicTags: fc.array(fc.string())
          }), { minLength: 0, maxLength: 3 } // Intentionally 0 tested
        ),
        async (teacherId, title, subject, timeMs, questions) => {
          const data: QuizData = {
            teacherId, title, subject, timePerQuestion: timeMs,
            questions: questions as QuizQuestion[]
          };

          const isQuestionsPresent = questions.length > 0;
          const isEachQValid = questions.every(q => 
            q.question && q.options.length >= 2 && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length
          );

          try {
            await createQuiz(data);
            expect(isQuestionsPresent).toBe(true);
            expect(isEachQValid).toBe(true);
          } catch (e: any) {
            if (!isQuestionsPresent) {
              expect(e.message).toContain('At least one question is required');
            } else if (!isEachQValid) {
               // Either question lacking, options length issue, or bounds error
               expect(
                 e.message.includes('must have the text and at least 2 options') ||
                 e.message.includes('Correct answer index is out of bounds')
               ).toBe(true);
            } else {
              throw e;
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 32: Session code uniqueness', async () => {
    // Generate many sessions and assert they don't collision trap. 
    // We mock Prisma throwing if it collides. If it succeeds consecutively, it's unique.
    for (let i = 0; i < 100; i++) {
      const session = await startQuizSession(`quiz-${i}`);
      expect(session.sessionCode).toBeDefined();
      expect(session.sessionCode.length).toBe(6); // 3 bytes hex
    }
    
    // Check that redis gets initialized per code generated
    expect((redisClient as any)._store.size).toBe(100);
  });
});
