/**
 * Mock Test Service
 * Handles creation, retrieval, and assignment of mock tests.
 */

import prisma from '../../config/database';
import { GeneratedQuestion } from '../ai/questionGenerator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MockTestDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface CreateMockTestInput {
  authorId: string;
  name: string;
  subject: string;
  topics: string[];
  questions: GeneratedQuestion[];
  difficulty: MockTestDifficulty;
  // Optional teacher assignment
  assignedSection?: string;
  assignedYear?: number;
  assignedDept?: string;
  windowStart?: Date;
  windowEnd?: Date;
}

export interface MockTestSummary {
  id: string;
  name: string;
  subject: string;
  topics: string[];
  difficulty: MockTestDifficulty;
  questionCount: number;
  assignedSection?: string | null;
  assignedYear?: number | null;
  assignedDept?: string | null;
  windowStart?: Date | null;
  windowEnd?: Date | null;
  createdAt: Date;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createMockTest(input: CreateMockTestInput) {
  if (!input.name.trim()) throw new Error('Test name is required');
  if (!input.subject.trim()) throw new Error('Subject is required');
  if (!input.topics.length) throw new Error('At least one topic is required');
  if (!input.questions.length) throw new Error('At least one question is required');

  return prisma.mockTest.create({
    data: {
      authorId: input.authorId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      topics: input.topics,
      questions: input.questions as object[],
      difficulty: input.difficulty,
      questionCount: input.questions.length,
      assignedSection: input.assignedSection ?? null,
      assignedYear: input.assignedYear ?? null,
      assignedDept: input.assignedDept ?? null,
      windowStart: input.windowStart ?? null,
      windowEnd: input.windowEnd ?? null,
    },
  });
}

export async function getMockTestById(testId: string) {
  return prisma.mockTest.findUnique({ where: { id: testId } });
}

export async function getMockTestsByAuthor(authorId: string): Promise<MockTestSummary[]> {
  const tests = await prisma.mockTest.findMany({
    where: { authorId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      subject: true,
      topics: true,
      difficulty: true,
      questionCount: true,
      assignedSection: true,
      assignedYear: true,
      assignedDept: true,
      windowStart: true,
      windowEnd: true,
      createdAt: true,
    },
  });

  return tests.map((t) => ({
    ...t,
    difficulty: t.difficulty as MockTestDifficulty,
  }));
}

/** Returns tests assigned to a student's section that are within the active window */
export async function getAssignedMockTests(
  year: number,
  section: string,
  dept: string
): Promise<MockTestSummary[]> {
  const now = new Date();
  const tests = await prisma.mockTest.findMany({
    where: {
      assignedYear: year,
      assignedSection: section,
      assignedDept: dept,
      OR: [
        { windowStart: null },
        { windowStart: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { windowEnd: null },
            { windowEnd: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      subject: true,
      topics: true,
      difficulty: true,
      questionCount: true,
      assignedSection: true,
      assignedYear: true,
      assignedDept: true,
      windowStart: true,
      windowEnd: true,
      createdAt: true,
    },
  });

  return tests.map((t) => ({
    ...t,
    difficulty: t.difficulty as MockTestDifficulty,
  }));
}

// ─── Proctoring functions ─────────────────────────────────────────────────────

export interface ViolationEvent {
  type: 'fullscreen_exit' | 'tab_switch' | 'face_not_detected';
  timestamp: string;
}

export interface StartTestInput {
  testId: string;
  studentId: string;
}

export interface SubmitTestInput {
  testId: string;
  studentId: string;
  answers: { questionId: string; selectedOption: number }[];
  timeTaken: number;
  violations: ViolationEvent[];
}

export async function startMockTest(input: StartTestInput) {
  const { testId, studentId } = input;

  // Check if attempt already exists
  const existing = await prisma.mockTestAttempt.findUnique({
    where: { testId_studentId: { testId, studentId } },
  });

  if (existing) {
    throw new Error('Test attempt already exists for this student');
  }

  return prisma.mockTestAttempt.create({
    data: {
      testId,
      studentId,
      answers: [],
      score: 0,
      totalPoints: 0,
      timeTaken: 0,
      violations: [],
    },
  });
}

export async function submitMockTest(input: SubmitTestInput) {
  const { testId, studentId, answers, timeTaken, violations } = input;

  // Get the test to calculate score
  const test = await prisma.mockTest.findUnique({ where: { id: testId } });
  if (!test) {
    throw new Error('Mock test not found');
  }

  const questions = test.questions as any[];
  let score = 0;
  let totalPoints = 0;

  // Calculate score
  questions.forEach((q) => {
    totalPoints += q.points || 1;
    const answer = answers.find((a) => a.questionId === q.id);
    if (answer && answer.selectedOption === (q.correctAnswer ?? q.correctOption)) {
      score += q.points || 1;
    }
  });

  // Update or create attempt
  return prisma.mockTestAttempt.upsert({
    where: { testId_studentId: { testId, studentId } },
    update: {
      answers,
      score,
      totalPoints,
      timeTaken,
      submittedAt: new Date(),
      violations: violations as any,
    },
    create: {
      testId,
      studentId,
      answers,
      score,
      totalPoints,
      timeTaken,
      submittedAt: new Date(),
      violations: violations as any,
    },
  });
}

export async function getTestResults(testId: string) {
  const attempts = await prisma.mockTestAttempt.findMany({
    where: { testId },
    include: {
      test: {
        select: {
          name: true,
          subject: true,
        },
      },
    },
  });

  return attempts.map((attempt) => {
    const violations = (attempt.violations as any) as ViolationEvent[];
    const violationCounts = violations.reduce(
      (acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      studentId: attempt.studentId,
      score: attempt.score,
      totalPoints: attempt.totalPoints,
      percentage: attempt.totalPoints > 0 ? (attempt.score / attempt.totalPoints) * 100 : 0,
      timeTaken: attempt.timeTaken,
      violations: violationCounts,
      totalViolations: violations.length,
      flagged: violations.length >= 3,
      submittedAt: attempt.submittedAt,
    };
  });
}
