import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import prisma from '../../config/database';
import redisClient from '../../config/redis';
import {
  grantPowerUpsToStudent,
  activatePowerUp,
  getStudentPowerUps,
  hasUnusedPowerUp,
} from './powerups';
import { PowerUpType } from '@prisma/client';

describe('Power-up System - Property-Based Tests', () => {
  let testSessionId: string;
  let testSessionCode: string;
  let testStudentId: string;

  beforeAll(async () => {
    // Connect to Redis
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // Create test data
    const user = await prisma.user.create({
      data: {
        email: `test-powerup-${Date.now()}@test.com`,
        role: 'STUDENT',
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        name: 'Test Student',
        registrationNumber: `RA${Date.now()}`,
        course: 'CSE',
        department: 'CSE',
        branch: 'CSE',
        year: 1,
        section: 'A',
        batch: 'Batch 1',
        group: 'A1',
        collegeMailId: 'test@college.edu',
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: (await prisma.user.create({
          data: {
            email: `teacher-${Date.now()}@test.com`,
            role: 'TEACHER',
          },
        })).id,
        name: 'Test Teacher',
        department: 'CSE',
        subjects: ['DSA'],
      },
    });

    const teacherUser = await prisma.user.findFirst({
      where: { teacher: { id: teacher.id } },
    });

    const quiz = await prisma.quiz.create({
      data: {
        teacherId: teacher.id,
        authorId: teacherUser!.id,
        title: 'Test Quiz',
        subject: 'DSA',
        questions: [
          {
            question: 'What is a stack?',
            options: ['LIFO', 'FIFO', 'Random', 'Sorted'],
            correctAnswerIndex: 0,
            topicTags: ['Data Structures'],
          },
        ],
        timePerQuestion: 30,
      },
    });

    const sessionCode = `TEST${Date.now()}`;
    const session = await prisma.quizSession.create({
      data: {
        quizId: quiz.id,
        sessionCode,
        qrCodeUrl: 'https://example.com/qr',
        status: 'IN_PROGRESS',
      },
    });

    testSessionId = session.id;
    testSessionCode = sessionCode;
    testStudentId = student.id;

    // Initialize Redis state
    await redisClient.set(
      `quiz:${sessionCode}`,
      JSON.stringify({
        sessionId: session.id,
        quizId: quiz.id,
        status: 'IN_PROGRESS',
        currentQuestionIndex: 0,
        leaderboard: {},
        participants: [student.id],
        answers: {},
        questionStartTimes: {},
        quizQuestions: [
          {
            question: 'What is a stack?',
            options: ['LIFO', 'FIFO', 'Random', 'Sorted'],
            correctAnswerIndex: 0,
            topicTags: ['Data Structures'],
          },
        ],
        timePerQuestion: 30,
      })
    );
  });

  afterAll(async () => {
    // Cleanup
    await prisma.powerUp.deleteMany({
      where: { studentId: testStudentId },
    });
    await prisma.quizSession.deleteMany({
      where: { id: testSessionId },
    });
    await prisma.student.deleteMany({
      where: { id: testStudentId },
    });
    await prisma.user.deleteMany({
      where: {
        student: { id: testStudentId },
      },
    });

    // Disconnect Redis
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  });

  /**
   * Property 1: Each power-up can only be used once per session per student
   * Validates: Requirement 8.7, 8.8, 8.9, 8.10
   */
  it('Property: Each power-up can only be used once per session per student', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PowerUpType>('FIFTY_FIFTY', 'TIME_FREEZE', 'DOUBLE_POINTS', 'SHIELD'),
        async (powerUpType: PowerUpType) => {
          // Create a new student for this test
          const user = await prisma.user.create({
            data: {
              email: `test-once-${Date.now()}-${powerUpType}@test.com`,
              role: 'STUDENT',
            },
          });

          const student = await prisma.student.create({
            data: {
              userId: user.id,
              name: 'Test Student Once',
              registrationNumber: `RA${Date.now()}-${powerUpType}`,
              course: 'CSE',
              department: 'CSE',
              branch: 'CSE',
              year: 1,
              section: 'A',
              batch: 'Batch 1',
              group: 'A1',
              collegeMailId: `test-once-${powerUpType}@college.edu`,
            },
          });

          // Grant power-ups
          await grantPowerUpsToStudent(testSessionId, student.id);

          // First activation should succeed
          const firstActivation = await activatePowerUp(
            testSessionCode,
            student.id,
            powerUpType,
            0
          );
          expect(firstActivation.applied).toBe(true);

          // Second activation should fail
          try {
            await activatePowerUp(testSessionCode, student.id, powerUpType, 0);
            throw new Error('Should have thrown error on second activation');
          } catch (error) {
            expect((error as Error).message).toContain('already been used');
          }

          // Cleanup
          await prisma.powerUp.deleteMany({ where: { studentId: student.id } });
          await prisma.student.delete({ where: { id: student.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 4 } // One run per power-up type
    );
  });

  /**
   * Property 2: 50/50 always removes exactly 2 incorrect options, never the correct one
   * Validates: Requirement 8.7
   */
  it('Property: 50/50 removes exactly 2 incorrect options, never the correct one', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }),
        async (correctAnswerIndex: number) => {
          // Create a new session for this test
          const teacher = await prisma.teacher.findFirst();
          if (!teacher) throw new Error('No teacher found');

          const teacherUser = await prisma.user.findFirst({
            where: { teacher: { id: teacher.id } },
          });

          const quiz = await prisma.quiz.create({
            data: {
              teacherId: teacher.id,
              authorId: teacherUser!.id,
              title: 'Test Quiz 50/50',
              subject: 'DSA',
              questions: [
                {
                  question: 'Test question',
                  options: ['A', 'B', 'C', 'D'],
                  correctAnswerIndex,
                  topicTags: ['Test'],
                },
              ],
              timePerQuestion: 30,
            },
          });

          const sessionCode = `TEST50-${Date.now()}-${correctAnswerIndex}`;
          const session = await prisma.quizSession.create({
            data: {
              quizId: quiz.id,
              sessionCode,
              qrCodeUrl: 'https://example.com/qr',
              status: 'IN_PROGRESS',
            },
          });

          // Initialize Redis state
          await redisClient.set(
            `quiz:${sessionCode}`,
            JSON.stringify({
              sessionId: session.id,
              quizId: quiz.id,
              status: 'IN_PROGRESS',
              currentQuestionIndex: 0,
              leaderboard: {},
              participants: [testStudentId],
              answers: {},
              questionStartTimes: {},
              quizQuestions: [
                {
                  question: 'Test question',
                  options: ['A', 'B', 'C', 'D'],
                  correctAnswerIndex,
                  topicTags: ['Test'],
                },
              ],
              timePerQuestion: 30,
            })
          );

          // Grant and activate 50/50
          await grantPowerUpsToStudent(session.id, testStudentId);
          const effect = await activatePowerUp(sessionCode, testStudentId, 'FIFTY_FIFTY', 0);

          // Verify exactly 2 options were removed
          expect(effect.details.removedOptions).toHaveLength(2);

          // Verify correct answer was not removed
          expect(effect.details.removedOptions).not.toContain(correctAnswerIndex);

          // Verify remaining options include at least one option
          expect(effect.details.remainingOptions.length).toBeGreaterThan(0);

          // Cleanup
          await prisma.powerUp.deleteMany({ where: { sessionId: session.id } });
          await prisma.quizSession.delete({ where: { id: session.id } });
          await prisma.quiz.delete({ where: { id: quiz.id } });
        }
      ),
      { numRuns: 4 } // Test each possible correct answer index
    );
  });

  /**
   * Property 3: Double Points exactly doubles the awarded score for that question
   * Validates: Requirement 8.9
   */
  it('Property: Double Points multiplier is exactly 2x', async () => {
    await grantPowerUpsToStudent(testSessionId, testStudentId);

    // Activate Double Points
    const effect = await activatePowerUp(
      testSessionCode,
      testStudentId,
      'DOUBLE_POINTS',
      0
    );

    // Verify multiplier is exactly 2
    expect(effect.details.multiplier).toBe(2);
    expect(effect.applied).toBe(true);
  });

  /**
   * Property 4: Time Freeze adds exactly 10 seconds
   * Validates: Requirement 8.8
   */
  it('Property: Time Freeze adds exactly 10 seconds', async () => {
    // Create a new student for this test
    const user = await prisma.user.create({
      data: {
        email: `test-timefreeze-${Date.now()}@test.com`,
        role: 'STUDENT',
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        name: 'Test Student TimeFreeze',
        registrationNumber: `RA${Date.now()}-TF`,
        course: 'CSE',
        department: 'CSE',
        branch: 'CSE',
        year: 1,
        section: 'A',
        batch: 'Batch 1',
        group: 'A1',
        collegeMailId: 'test-tf@college.edu',
      },
    });

    // Grant power-ups
    await grantPowerUpsToStudent(testSessionId, student.id);

    // Activate Time Freeze
    const effect = await activatePowerUp(
      testSessionCode,
      student.id,
      'TIME_FREEZE',
      0
    );

    // Verify exactly 10 seconds were added
    expect(effect.details.bonusSeconds).toBe(10);
    expect(effect.applied).toBe(true);

    // Cleanup
    await prisma.powerUp.deleteMany({ where: { studentId: student.id } });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  /**
   * Property 5: Shield protection is applied correctly
   * Validates: Requirement 8.10
   */
  it('Property: Shield protection is applied to the correct question', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 0 }),
        async (questionIndex: number) => {
          // Create a new student for this test
          const user = await prisma.user.create({
            data: {
              email: `test-shield-${Date.now()}-${questionIndex}@test.com`,
              role: 'STUDENT',
            },
          });

          const student = await prisma.student.create({
            data: {
              userId: user.id,
              name: 'Test Student Shield',
              registrationNumber: `RA${Date.now()}-${questionIndex}`,
              course: 'CSE',
              department: 'CSE',
              branch: 'CSE',
              year: 1,
              section: 'A',
              batch: 'Batch 1',
              group: 'A1',
              collegeMailId: `test-shield-${questionIndex}@college.edu`,
            },
          });

          // Grant power-ups
          await grantPowerUpsToStudent(testSessionId, student.id);

          // Activate Shield
          const effect = await activatePowerUp(
            testSessionCode,
            student.id,
            'SHIELD',
            questionIndex
          );

          // Verify shield is applied to the correct question
          expect(effect.details.protected).toBe(true);
          expect(effect.details.appliedToQuestion).toBe(questionIndex);
          expect(effect.applied).toBe(true);

          // Cleanup
          await prisma.powerUp.deleteMany({ where: { studentId: student.id } });
          await prisma.student.delete({ where: { id: student.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property 6: All four power-up types are granted to each student
   * Validates: Requirement 8.11
   */
  it('Property: All four power-up types are granted to each student', async () => {
    // Create a new student for this test
    const user = await prisma.user.create({
      data: {
        email: `test-grant-${Date.now()}@test.com`,
        role: 'STUDENT',
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        name: 'Test Student Grant',
        registrationNumber: `RA${Date.now()}-GRANT`,
        course: 'CSE',
        department: 'CSE',
        branch: 'CSE',
        year: 1,
        section: 'A',
        batch: 'Batch 1',
        group: 'A1',
        collegeMailId: 'test-grant@college.edu',
      },
    });

    // Grant power-ups
    await grantPowerUpsToStudent(testSessionId, student.id);

    // Verify all four types were granted
    const powerUps = await getStudentPowerUps(testSessionId, student.id);
    expect(powerUps).toHaveLength(4);

    const types = powerUps.map(p => p.type).sort();
    expect(types).toEqual(['DOUBLE_POINTS', 'FIFTY_FIFTY', 'SHIELD', 'TIME_FREEZE']);

    // Verify all are unused initially
    powerUps.forEach(p => {
      expect(p.used).toBe(false);
    });

    // Cleanup
    await prisma.powerUp.deleteMany({ where: { studentId: student.id } });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  /**
   * Property 7: hasUnusedPowerUp correctly identifies unused power-ups
   * Validates: Requirement 8.6
   */
  it('Property: hasUnusedPowerUp correctly identifies unused power-ups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PowerUpType>('FIFTY_FIFTY', 'TIME_FREEZE', 'DOUBLE_POINTS', 'SHIELD'),
        async (powerUpType: PowerUpType) => {
          // Create a new student and session for this test
          const user = await prisma.user.create({
            data: {
              email: `test-unused-${Date.now()}-${powerUpType}@test.com`,
              role: 'STUDENT',
            },
          });

          const student = await prisma.student.create({
            data: {
              userId: user.id,
              name: 'Test Student Unused',
              registrationNumber: `RA${Date.now()}-${powerUpType}`,
              course: 'CSE',
              department: 'CSE',
              branch: 'CSE',
              year: 1,
              section: 'A',
              batch: 'Batch 1',
              group: 'A1',
              collegeMailId: `test-unused-${powerUpType}@college.edu`,
            },
          });

          // Create a new session for this test
          const teacher = await prisma.teacher.findFirst();
          if (!teacher) throw new Error('No teacher found');

          const teacherUser = await prisma.user.findFirst({
            where: { teacher: { id: teacher.id } },
          });

          const quiz = await prisma.quiz.create({
            data: {
              teacherId: teacher.id,
              authorId: teacherUser!.id,
              title: 'Test Quiz Unused',
              subject: 'DSA',
              questions: [
                {
                  question: 'Test question',
                  options: ['A', 'B', 'C', 'D'],
                  correctAnswerIndex: 0,
                  topicTags: ['Test'],
                },
              ],
              timePerQuestion: 30,
            },
          });

          const sessionCode = `TESTUNUSED-${Date.now()}-${powerUpType}`;
          const session = await prisma.quizSession.create({
            data: {
              quizId: quiz.id,
              sessionCode,
              qrCodeUrl: 'https://example.com/qr',
              status: 'IN_PROGRESS',
            },
          });

          // Initialize Redis state
          await redisClient.set(
            `quiz:${sessionCode}`,
            JSON.stringify({
              sessionId: session.id,
              quizId: quiz.id,
              status: 'IN_PROGRESS',
              currentQuestionIndex: 0,
              leaderboard: {},
              participants: [student.id],
              answers: {},
              questionStartTimes: {},
              quizQuestions: [
                {
                  question: 'Test question',
                  options: ['A', 'B', 'C', 'D'],
                  correctAnswerIndex: 0,
                  topicTags: ['Test'],
                },
              ],
              timePerQuestion: 30,
            })
          );

          // Grant power-ups
          await grantPowerUpsToStudent(session.id, student.id);

          // Before using, should return true
          let hasUnused = await hasUnusedPowerUp(session.id, student.id, powerUpType);
          expect(hasUnused).toBe(true);

          // Use the power-up
          await activatePowerUp(sessionCode, student.id, powerUpType, 0);

          // After using, should return false
          hasUnused = await hasUnusedPowerUp(session.id, student.id, powerUpType);
          expect(hasUnused).toBe(false);

          // Cleanup
          await prisma.powerUp.deleteMany({ where: { studentId: student.id } });
          await prisma.quizSession.delete({ where: { id: session.id } });
          await prisma.quiz.delete({ where: { id: quiz.id } });
          await prisma.student.delete({ where: { id: student.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 4 }
    );
  });
});
