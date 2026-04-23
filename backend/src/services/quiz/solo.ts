import prisma from '../../config/database';

export interface SoloQuizAttempt {
  quizId: string;
  studentId: string;
  answers: SoloAnswer[];
  score: number;
  totalPoints: number;
  completedAt: Date;
}

export interface SoloAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number; // seconds
}

export interface SoloQuizResult {
  quizId: string;
  title: string;
  score: number;
  totalPoints: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  topicBreakdown: TopicResult[];
  completedAt: Date;
}

export interface TopicResult {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
}

export async function recordSoloQuizAttempt(attempt: SoloQuizAttempt) {
  // Fetch quiz to get title and calculate total points
  const quiz = await prisma.quiz.findUnique({
    where: { id: attempt.quizId },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  // Update lastPlayedAt
  await prisma.quiz.update({
    where: { id: attempt.quizId },
    data: { lastPlayedAt: new Date() },
  });

  // Store attempt in database (using QuizParticipation model for consistency)
  // For solo mode, we use a special sessionId format
  const soloSessionId = `solo-${attempt.quizId}-${attempt.studentId}-${Date.now()}`;

  const participation = await prisma.quizParticipation.create({
    data: {
      sessionId: soloSessionId,
      studentId: attempt.studentId,
      answers: attempt.answers as any,
      score: attempt.score,
      rank: 1, // Solo mode always rank 1
      completedAt: attempt.completedAt,
    },
  });

  return participation;
}

export async function calculateSoloQuizResult(
  quizId: string,
  answers: SoloAnswer[]
): Promise<SoloQuizResult> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const questions = quiz.questions as any[];
  let totalScore = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  const topicMap: Record<string, { correct: number; total: number }> = {};

  // Calculate score and topic breakdown
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const answer = answers[i];
    const points = question.points || 1;

    totalPoints += points;

    if (answer && answer.selectedOption === question.correctAnswerIndex) {
      totalScore += points;
      correctCount++;
    } else {
      incorrectCount++;
    }

    // Track topic performance
    for (const topic of question.topicTags) {
      if (!topicMap[topic]) {
        topicMap[topic] = { correct: 0, total: 0 };
      }
      topicMap[topic].total++;
      if (answer && answer.selectedOption === question.correctAnswerIndex) {
        topicMap[topic].correct++;
      }
    }
  }

  const topicBreakdown: TopicResult[] = Object.entries(topicMap).map(
    ([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100),
    })
  );

  return {
    quizId,
    title: quiz.title,
    score: totalScore,
    totalPoints,
    percentage: Math.round((totalScore / totalPoints) * 100),
    correctCount,
    incorrectCount,
    topicBreakdown,
    completedAt: new Date(),
  };
}

export async function getSoloQuizHistory(studentId: string, quizId?: string) {
  const where: any = {
    studentId,
    sessionId: {
      startsWith: 'solo-',
    },
  };

  if (quizId) {
    where.sessionId = {
      startsWith: `solo-${quizId}-`,
    };
  }

  const attempts = await prisma.quizParticipation.findMany({
    where,
    orderBy: {
      completedAt: 'desc',
    },
  });

  return attempts;
}
