import prisma from '../../config/database';
import redisClient from '../../config/redis';
import { PowerUpType } from '@prisma/client';

export interface PowerUpEffect {
  type: PowerUpType;
  applied: boolean;
  details: Record<string, any>;
}

/**
 * Grant one of each power-up type to a student when they join a quiz session
 * Requirement 8.11: Each student gets one of each power-up type
 */
export async function grantPowerUpsToStudent(
  sessionId: string,
  studentId: string
): Promise<void> {
  const powerUpTypes: PowerUpType[] = ['FIFTY_FIFTY', 'TIME_FREEZE', 'DOUBLE_POINTS', 'SHIELD'];

  for (const type of powerUpTypes) {
    await prisma.powerUp.create({
      data: {
        sessionId,
        studentId,
        type,
        used: false,
      },
    });
  }
}

/**
 * Activate a power-up for a student during a quiz session
 * Requirement 8.6-8.10: Implement effect logic for each power-up type
 */
export async function activatePowerUp(
  sessionCode: string,
  studentId: string,
  type: PowerUpType,
  questionIndex: number
): Promise<PowerUpEffect> {
  // Get quiz session from database to get the sessionId
  const session = await prisma.quizSession.findUnique({
    where: { sessionCode },
  });

  if (!session) {
    throw new Error('Quiz session not found');
  }

  // Check if power-up exists and hasn't been used
  const powerUp = await prisma.powerUp.findUnique({
    where: {
      sessionId_studentId_type: {
        sessionId: session.id,
        studentId,
        type,
      },
    },
  });

  if (!powerUp) {
    throw new Error(`Power-up ${type} not found for this student`);
  }

  if (powerUp.used) {
    throw new Error(`Power-up ${type} has already been used`);
  }

  // Mark power-up as used
  await prisma.powerUp.update({
    where: { id: powerUp.id },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });

  // Get quiz session state from Redis
  const stateStr = await redisClient.get(`quiz:${sessionCode}`);
  if (!stateStr) {
    throw new Error('Quiz session not found');
  }

  const state = JSON.parse(stateStr);
  const questions = state.quizQuestions || [];
  const currentQuestion = questions[questionIndex];

  if (!currentQuestion) {
    throw new Error('Question not found');
  }

  const effect: PowerUpEffect = {
    type,
    applied: true,
    details: {},
  };

  // Apply power-up effect based on type
  switch (type) {
    case 'FIFTY_FIFTY':
      // Remove 2 incorrect options from current question
      effect.details = applyFiftyFifty(currentQuestion, questionIndex, state);
      break;

    case 'TIME_FREEZE':
      // Add 10 seconds to student's personal countdown timer
      effect.details = applyTimeFreeze(studentId, state);
      break;

    case 'DOUBLE_POINTS':
      // Double the points awarded for correct answer on that question
      effect.details = applyDoublePoints(studentId, questionIndex, state);
      break;

    case 'SHIELD':
      // Protect from losing streak bonus points on incorrect answer
      effect.details = applyShield(studentId, questionIndex, state);
      break;
  }

  // Update Redis state with power-up effects
  await redisClient.set(`quiz:${sessionCode}`, JSON.stringify(state));

  return effect;
}

/**
 * FIFTY_FIFTY: Remove 2 incorrect options from current question
 * Requirement 8.7
 */
function applyFiftyFifty(
  question: any,
  questionIndex: number,
  state: any
): Record<string, any> {
  const correctIndex = question.correctAnswerIndex;
  const incorrectIndices = question.options
    .map((_: any, i: number) => i)
    .filter((i: number) => i !== correctIndex);

  // Randomly select 2 incorrect options to remove
  const toRemove = incorrectIndices
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  // Store which options are hidden for this question
  if (!state.powerUpEffects) {
    state.powerUpEffects = {};
  }
  if (!state.powerUpEffects[questionIndex]) {
    state.powerUpEffects[questionIndex] = {};
  }

  state.powerUpEffects[questionIndex].fiftyFiftyRemoved = toRemove;

  return {
    removedOptions: toRemove,
    remainingOptions: question.options
      .map((opt: string, i: number) => (!toRemove.includes(i) ? opt : null))
      .filter((opt: string | null) => opt !== null),
  };
}

/**
 * TIME_FREEZE: Add 10 seconds to student's personal countdown timer
 * Requirement 8.8
 */
function applyTimeFreeze(studentId: string, state: any): Record<string, any> {
  const BONUS_SECONDS = 10;

  if (!state.studentTimerBonuses) {
    state.studentTimerBonuses = {};
  }

  state.studentTimerBonuses[studentId] = (state.studentTimerBonuses[studentId] || 0) + BONUS_SECONDS;

  return {
    bonusSeconds: BONUS_SECONDS,
    totalBonus: state.studentTimerBonuses[studentId],
  };
}

/**
 * DOUBLE_POINTS: Double the points awarded for correct answer on that question
 * Requirement 8.9
 */
function applyDoublePoints(
  studentId: string,
  questionIndex: number,
  state: any
): Record<string, any> {
  if (!state.powerUpEffects) {
    state.powerUpEffects = {};
  }
  if (!state.powerUpEffects[questionIndex]) {
    state.powerUpEffects[questionIndex] = {};
  }

  state.powerUpEffects[questionIndex].doublePointsStudents =
    state.powerUpEffects[questionIndex].doublePointsStudents || [];

  if (!state.powerUpEffects[questionIndex].doublePointsStudents.includes(studentId)) {
    state.powerUpEffects[questionIndex].doublePointsStudents.push(studentId);
  }

  return {
    multiplier: 2,
    appliedToQuestion: questionIndex,
  };
}

/**
 * SHIELD: Protect from losing streak bonus points on incorrect answer
 * Requirement 8.10
 */
function applyShield(
  studentId: string,
  questionIndex: number,
  state: any
): Record<string, any> {
  if (!state.shieldedStudents) {
    state.shieldedStudents = {};
  }

  state.shieldedStudents[studentId] = {
    active: true,
    appliedAt: Date.now(),
    questionIndex,
  };

  return {
    protected: true,
    appliedToQuestion: questionIndex,
  };
}

/**
 * Get all available power-ups for a student in a session
 */
export async function getStudentPowerUps(
  sessionId: string,
  studentId: string
): Promise<Array<{ type: PowerUpType; used: boolean }>> {
  const powerUps = await prisma.powerUp.findMany({
    where: {
      sessionId,
      studentId,
    },
    select: {
      type: true,
      used: true,
    },
  });

  return powerUps;
}

/**
 * Check if a student has an unused power-up of a specific type
 */
export async function hasUnusedPowerUp(
  sessionId: string,
  studentId: string,
  type: PowerUpType
): Promise<boolean> {
  const powerUp = await prisma.powerUp.findUnique({
    where: {
      sessionId_studentId_type: {
        sessionId,
        studentId,
        type,
      },
    },
  });

  return powerUp ? !powerUp.used : false;
}
