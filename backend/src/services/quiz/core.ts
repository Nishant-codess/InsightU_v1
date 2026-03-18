import prisma from '../../config/database';
import redisClient from '../../config/redis';
import crypto from 'crypto';
import QRCode from 'qrcode';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  topicTags: string[];
}

export interface QuizData {
  teacherId: string;
  title: string;
  subject: string;
  questions: QuizQuestion[];
  timePerQuestion: number;
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
  }

  return prisma.quiz.create({
    data: {
      teacherId: data.teacherId,
      title: data.title,
      subject: data.subject,
      questions: data.questions as any,
      timePerQuestion: data.timePerQuestion,
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

  // Init state in redis
  const redisState = {
    sessionId: session.id,
    quizId,
    status: 'WAITING',
    currentQuestionIndex: 0,
    leaderboard: {}, // studentId -> score
  };

  await redisClient.set(`quiz:${sessionCode}`, JSON.stringify(redisState));
  
  return session;
}
