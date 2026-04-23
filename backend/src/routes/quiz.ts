import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createQuiz, getUserQuizLibrary, startQuizSession } from '../services/quiz/core';
import { endQuizSession } from '../services/quiz/realtime';
import { recordSoloQuizAttempt, calculateSoloQuizResult, getSoloQuizHistory } from '../services/quiz/solo';
import redisClient from '../config/redis';
import prisma from '../config/database';

const router = Router();

// POST /api/quiz — create a quiz (student or teacher)
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const quiz = await createQuiz({ ...req.body, authorId: userId });
    res.status(201).json(quiz);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/quiz/:quizId — delete a quiz
router.delete('/:quizId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.userAuth?.userId;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Only author can delete
    if (quiz.authorId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.quiz.delete({
      where: { id: quizId },
    });

    res.status(200).json({ message: 'Quiz deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /api/quiz/:quizId — get a single quiz
router.get('/:quizId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { quizId } = req.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Check if quiz is shareable or user is the author
    if (quiz.visibility === 'PRIVATE' && quiz.authorId !== req.userAuth?.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(quiz);
  } catch (error) {
    next(error);
  }
});

// GET /api/quiz/library — get user's quiz library
router.get('/library', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const quizzes = await getUserQuizLibrary(userId);
    res.status(200).json(quizzes);
  } catch (error) {
    next(error);
  }
});

// POST /api/quiz/:quizId/session — start a quiz session (teacher or quiz author)
router.post('/:quizId/session', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { quizId } = req.params;
    const session = await startQuizSession(quizId);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

// POST /api/quiz/session/:sessionCode/end — end a quiz session (teacher only)
router.post('/session/:sessionCode/end', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { sessionCode } = req.params;
    const results = await endQuizSession(sessionCode);
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/quiz/session/:sessionCode — get session state (any authenticated user)
router.get('/session/:sessionCode', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { sessionCode } = req.params;
    const stateStr = await redisClient.get(`quiz:${sessionCode}`);
    if (!stateStr) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    res.status(200).json(JSON.parse(stateStr));
  } catch (error) {
    next(error);
  }
});

// POST /api/quiz/:quizId/solo/attempt — record a solo quiz attempt
router.post('/:quizId/solo/attempt', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { quizId } = req.params;
    const studentId = req.userAuth?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ error: 'Invalid answers format' });
      return;
    }

    // Calculate result
    const result = await calculateSoloQuizResult(quizId, answers);

    // Record attempt
    await recordSoloQuizAttempt({
      quizId,
      studentId,
      answers,
      score: result.score,
      totalPoints: result.totalPoints,
      completedAt: new Date(),
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/quiz/:quizId/solo/history — get solo quiz history for a quiz
router.get('/:quizId/solo/history', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { quizId } = req.params;
    const studentId = req.userAuth?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const history = await getSoloQuizHistory(studentId, quizId);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
});

export default router;
