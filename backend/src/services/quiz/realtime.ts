import { Server, Socket } from 'socket.io';
import redisClient from '../../config/redis';
import prisma from '../../config/database';
import { grantPowerUpsToStudent, activatePowerUp } from './powerups';

export interface LeaderboardEntry {
  studentId: string;
  score: number;
  rank: number;
}

export interface TopicAnalytics {
  topic: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number; // 0-100 percentage
}

export interface QuizResults {
  sessionId: string;
  totalParticipants: number;
  finalLeaderboard: LeaderboardEntry[];
  topicAnalytics: TopicAnalytics[];
}

export async function updateLeaderboard(sessionCode: string): Promise<LeaderboardEntry[]> {
  const stateStr = await redisClient.get(`quiz:${sessionCode}`);
  if (!stateStr) return [];

  const state = JSON.parse(stateStr);
  const leaderboard: Record<string, number> = state.leaderboard ?? {};

  const entries = Object.entries(leaderboard).map(([studentId, score]) => ({
    studentId,
    score: score as number,
  }));

  // Sort descending by score
  entries.sort((a, b) => b.score - a.score);

  // Assign standard competition ranks (1,1,3 — not dense)
  const ranked: LeaderboardEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const rank = i === 0 || entries[i].score < entries[i - 1].score ? i + 1 : ranked[i - 1].rank;
    ranked.push({ ...entries[i], rank });
  }

  return ranked;
}

export interface AnswerPayload {
  sessionCode: string;
  studentId: string;
  questionIndex: number;
  answerIndex: number;
  timestamp: string; // ISO string from client
}

// Standalone joinSession function (Property 36)
export async function joinSession(
  sessionCode: string,
  studentId: string
): Promise<{ success: boolean; participantCount: number }> {
  const stateStr = await redisClient.get(`quiz:${sessionCode}`);
  if (!stateStr) {
    return { success: false, participantCount: 0 };
  }

  const state = JSON.parse(stateStr);

  if (!state.participants) {
    state.participants = [];
  }
  if (!state.participants.includes(studentId)) {
    state.participants.push(studentId);
  }

  if (!state.answers) {
    state.answers = {};
  }
  if (!state.answers[studentId]) {
    state.answers[studentId] = [];
  }

  await redisClient.set(`quiz:${sessionCode}`, JSON.stringify(state));

  // Grant power-ups to student when they join (Requirement 8.11)
  try {
    await grantPowerUpsToStudent(state.sessionId, studentId);
  } catch (error) {
    console.error('Failed to grant power-ups:', error);
  }

  return { success: true, participantCount: state.participants.length };
}

// Standalone submitAnswer function (Properties 38, 39)
export async function submitAnswer(
  sessionCode: string,
  payload: AnswerPayload
): Promise<{ isCorrect: boolean; pointsAwarded: number; currentScore: number }> {
  const stateStr = await redisClient.get(`quiz:${sessionCode}`);
  if (!stateStr) throw new Error('Session not found');

  const state = JSON.parse(stateStr);

  if (state.status !== 'IN_PROGRESS') {
    throw new Error('Quiz is not currently active');
  }

  // Initialise answers map if missing (backward compat)
  if (!state.answers) state.answers = {};
  if (!state.answers[payload.studentId]) state.answers[payload.studentId] = [];
  if (!state.leaderboard[payload.studentId]) state.leaderboard[payload.studentId] = 0;

  // Determine correctness and points
  let isCorrect = false;
  let pointsAwarded = 10; // default fallback for backward compat / missing quiz data

  const questions: Array<{ correctAnswerIndex: number; points?: number }> | undefined =
    state.quizQuestions;

  if (questions && questions[payload.questionIndex] !== undefined) {
    const question = questions[payload.questionIndex];
    isCorrect = payload.answerIndex === question.correctAnswerIndex;

    if (isCorrect) {
      const maxPoints = question.points ?? 1000;
      const timeLimit: number = state.timePerQuestion ?? 30;

      // Calculate time spent since question started
      let timeSpent = 0;
      if (state.questionStartTimes && state.questionStartTimes[payload.questionIndex]) {
        timeSpent = Date.now() - Date.parse(state.questionStartTimes[payload.questionIndex]);
      }

      pointsAwarded = Math.round(
        maxPoints * Math.max(0.1, 1 - timeSpent / (timeLimit * 1000))
      );
    } else {
      pointsAwarded = 0;
    }
  }

  // Record the answer
  const answerRecord = {
    questionIndex: payload.questionIndex,
    answerIndex: payload.answerIndex,
    isCorrect,
    pointsAwarded,
    timestamp: payload.timestamp,
    timeSpent:
      state.questionStartTimes && state.questionStartTimes[payload.questionIndex]
        ? Date.now() - Date.parse(state.questionStartTimes[payload.questionIndex])
        : 0,
  };

  state.answers[payload.studentId].push(answerRecord);
  state.leaderboard[payload.studentId] += pointsAwarded;

  await redisClient.set(`quiz:${sessionCode}`, JSON.stringify(state));

  return {
    isCorrect,
    pointsAwarded,
    currentScore: state.leaderboard[payload.studentId],
  };
}

export function setupSocketIO(io: Server) {
  io.on('connection', (socket: Socket) => {

    // Section feed room joining
    socket.on('join-section', (sectionKey: string) => {
      socket.join(`section:${sectionKey}`);
    });

    // ── Sketch Board realtime ──────────────────────────────────────────────
    socket.on('board:join', (shareToken: string) => {
      socket.join(`board:${shareToken}`);
    });

    socket.on('board:stroke', (data: { shareToken: string; stroke: any }) => {
      socket.to(`board:${data.shareToken}`).emit('board:stroke', data.stroke);
    });

    socket.on('board:clear', (shareToken: string) => {
      socket.to(`board:${shareToken}`).emit('board:clear');
    });

    // Property 36: Session joining
    socket.on('joinSession', async (data: { sessionCode: string; studentId: string }) => {
      const stateStr = await redisClient.get(`quiz:${data.sessionCode}`);
      if (!stateStr) {
        socket.emit('error', { message: 'Session not found or expired' });
        return;
      }

      const result = await joinSession(data.sessionCode, data.studentId);
      if (!result.success) {
        socket.emit('error', { message: 'Session not found or expired' });
        return;
      }

      socket.join(data.sessionCode);
      socket.emit('sessionJoined', {
        sessionCode: data.sessionCode,
        message: 'Successfully joined session',
      });

      // Notify room of updated participant count
      io.to(data.sessionCode).emit('participantJoined', { count: result.participantCount });
    });

    // Properties 38, 39: Answer recording and leaderboard broadcast
    socket.on('submitAnswer', async (data: AnswerPayload) => {
      try {
        const result = await submitAnswer(data.sessionCode, data);

        // Emit result back to the submitting socket
        socket.emit('answerResult', result);

        // Broadcast ranked leaderboard update to the room (Property 33, 39)
        const rankedLeaderboard = await updateLeaderboard(data.sessionCode);
        io.to(data.sessionCode).emit('leaderboardUpdate', rankedLeaderboard);
      } catch {
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // Power-up activation event handler (Requirements 8.6-8.11)
    socket.on('activatePowerUp', async (data: { sessionCode: string; studentId: string; type: string; questionIndex: number }) => {
      try {
        const effect = await activatePowerUp(
          data.sessionCode,
          data.studentId,
          data.type as any,
          data.questionIndex
        );

        // Emit effect back to the student
        socket.emit('powerUpActivated', effect);

        // Broadcast to room that a power-up was used
        io.to(data.sessionCode).emit('powerUpUsed', {
          studentId: data.studentId,
          type: data.type,
          questionIndex: data.questionIndex,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });
  });
}

// Property 40: Response persistence on session end; Property 34: Topic-level analytics
export async function endQuizSession(
  sessionCode: string,
  io: Server | null = null
): Promise<QuizResults> {
  const stateStr = await redisClient.get(`quiz:${sessionCode}`);
  if (!stateStr) throw new Error('Session not found');

  const state = JSON.parse(stateStr);
  state.status = 'COMPLETED';

  // Build final ranked leaderboard
  const leaderboard: Record<string, number> = state.leaderboard ?? {};
  const entries = Object.entries(leaderboard).map(([studentId, score]) => ({
    studentId,
    score: score as number,
  }));
  entries.sort((a, b) => b.score - a.score);

  const finalLeaderboard: LeaderboardEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const rank =
      i === 0 || entries[i].score < entries[i - 1].score ? i + 1 : finalLeaderboard[i - 1].rank;
    finalLeaderboard.push({ ...entries[i], rank });
  }

  // Persist responses from memory to Postgres
  await prisma.quizSession.update({
    where: { id: state.sessionId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
    },
  });

  for (const entry of finalLeaderboard) {
    await prisma.quizParticipation.create({
      data: {
        sessionId: state.sessionId,
        studentId: entry.studentId,
        answers: state.answers?.[entry.studentId] ?? [],
        score: entry.score,
        rank: entry.rank,
      },
    });
  }

  // Generate topic-level analytics (Property 34)
  const topicAnalytics = generateTopicAnalytics(state);

  // Cleanup redis
  await redisClient.del(`quiz:${sessionCode}`);

  const results: QuizResults = {
    sessionId: state.sessionId,
    totalParticipants: finalLeaderboard.length,
    finalLeaderboard,
    topicAnalytics,
  };

  if (io) {
    io.to(sessionCode).emit('quizEnded', results);
  }

  return results;
}

function generateTopicAnalytics(state: {
  quizQuestions?: Array<{ topicTags: string[] }>;
  answers?: Record<string, Array<{ questionIndex: number; isCorrect: boolean }>>;
}): TopicAnalytics[] {
  if (!state.quizQuestions || state.quizQuestions.length === 0) return [];

  const topicMap = new Map<string, { total: number; correct: number }>();

  const allAnswers = Object.values(state.answers ?? {}).flat();
  for (const answer of allAnswers) {
    const question = state.quizQuestions[answer.questionIndex];
    if (!question) continue;
    const topic = question.topicTags?.[0];
    if (!topic) continue;

    const existing = topicMap.get(topic) ?? { total: 0, correct: 0 };
    existing.total += 1;
    if (answer.isCorrect) existing.correct += 1;
    topicMap.set(topic, existing);
  }

  return Array.from(topicMap.entries()).map(([topic, { total, correct }]) => ({
    topic,
    totalAnswers: total,
    correctAnswers: correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}

export async function getQuizResults(sessionId: string): Promise<QuizResults | null> {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { participations: true },
  });

  if (!session) return null;

  const sorted = [...(session.participations as Array<{ studentId: string; score: number; rank: number }>)]
    .sort((a, b) => b.score - a.score);

  const finalLeaderboard: LeaderboardEntry[] = sorted.map((p) => ({
    studentId: p.studentId,
    score: p.score,
    rank: p.rank,
  }));

  return {
    sessionId,
    totalParticipants: finalLeaderboard.length,
    finalLeaderboard,
    topicAnalytics: [],
  };
}
