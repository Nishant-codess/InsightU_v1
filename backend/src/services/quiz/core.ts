import prisma from '../../config/database';
import redisClient from '../../config/redis';
import crypto from 'crypto';
import QRCode from 'qrcode';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  topicTags: string[];
  points?: number;
}

export interface QuizData {
  authorId: string;
  teacherId?: string;
  title: string;
  subject: string;
  questions: QuizQuestion[];
  timePerQuestion: number;
  visibility?: 'PRIVATE' | 'SHAREABLE';
}

export async function createQuiz(data: QuizData) {
  // Validate questions exist
  if (!data.questions || data.questions.length === 0) {
    throw new Error('At least one question is required');
  }

  // Validate properties for each question (Property 31: Multiple choice format, topic tags)
  for (const q of data.questions) {
    if (!q.question || !q.options || q.options.length < 2) {
      throw new Error('Each question must have the text and at least 2 options');
    }
    if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
      throw new Error('Correct answer index is out of bounds');
    }
    if (!q.topicTags || q.topicTags.length === 0) {
      throw new Error('Each question must have at least one topic tag');
    }
  }

  return prisma.quiz.create({
    data: {
      authorId: data.authorId,
      teacherId: data.teacherId,
      title: data.title,
      subject: data.subject,
      questions: data.questions as any,
      timePerQuestion: data.timePerQuestion,
      visibility: data.visibility || 'PRIVATE',
    },
  });
}

export async function getUserQuizLibrary(userId: string) {
  return prisma.quiz.findMany({
    where: {
      authorId: userId,
    },
    orderBy: {
      lastPlayedAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      subject: true,
      questions: true,
      timePerQuestion: true,
      visibility: true,
      createdAt: true,
      lastPlayedAt: true,
    },
  });
}

export async function startQuizSession(quizId: string) {
  // Generate unique session code
  const sessionCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // Property 32
  
  // Create QR code
  const joinUrl = `https://insightu.dev/join/${sessionCode}`;
  const qrCodeUrl = await QRCode.toDataURL(joinUrl);

  const session = await prisma.quizSession.create({
    data: {
      quizId,
      sessionCode,
      qrCodeUrl,
      status: 'WAITING', // WAITING, IN_PROGRESS, COMPLETED
    },
  });

  // Fetch quiz to store questions and timePerQuestion in Redis for answer validation
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

  // Init state in redis
  const redisState = {
    sessionId: session.id,
    quizId,
    status: 'WAITING',
    currentQuestionIndex: 0,
    leaderboard: {}, // studentId -> score
    participants: [],
    answers: {},
    questionStartTimes: {},
    quizQuestions: quiz?.questions ?? [],
    timePerQuestion: quiz?.timePerQuestion ?? 30,
  };

  await redisClient.set(`quiz:${sessionCode}`, JSON.stringify(redisState));
  
  return session;
}
