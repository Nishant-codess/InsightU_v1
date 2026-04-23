/**
 * Mock Test Routes
 *
 * POST /api/mock-tests/generate   — extract PDF text + generate AI questions (preview)
 * POST /api/mock-tests            — finalize and save a mock test
 * GET  /api/mock-tests            — list tests authored by the current user
 * GET  /api/mock-tests/assigned   — list tests assigned to the student's section
 * GET  /api/mock-tests/:id        — get a single mock test (with questions)
 *
 * GET  /api/user/ai-config        — get AI provider config (no key)
 * PUT  /api/user/ai-config        — upsert AI provider config
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAIConfig, upsertAIConfig } from '../services/ai/aiProvider';
import {
  extractTextFromPDF,
  generateQuestionsFromText,
  Difficulty,
} from '../services/ai/questionGenerator';
import {
  createMockTest,
  getMockTestById,
  getMockTestsByAuthor,
  getAssignedMockTests,
} from '../services/mockTest/mockTest';
import prisma from '../config/database';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── AI Config endpoints ──────────────────────────────────────────────────────

router.get('/ai-config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const config = await getAIConfig(userId);
    if (!config) {
      res.status(200).json({ configured: false });
      return;
    }
    res.status(200).json({ configured: true, ...config });
  } catch (err) {
    next(err);
  }
});

router.put('/ai-config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const { provider, apiKey, baseUrl } = req.body;

    if (!provider || !apiKey) {
      res.status(400).json({ error: 'provider and apiKey are required' });
      return;
    }

    const config = await upsertAIConfig(userId, { provider, apiKey, baseUrl });
    res.status(200).json(config);
  } catch (err) {
    next(err);
  }
});

// ─── Mock test routes (mounted at /api/mock-tests) ───────────────────────────

/**
 * POST /api/mock-tests/generate
 * Accepts multipart/form-data with PDF files + generation params.
 * Returns generated questions for review — does NOT save a test yet.
 */
router.post(
  '/generate',
  authenticate,
  upload.array('pdfs', 5),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userAuth!.userId;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'At least one PDF file is required' });
        return;
      }

      const count = Math.min(100, Math.max(10, parseInt(req.body.count ?? '10', 10)));
      const difficulty = (['EASY', 'MEDIUM', 'HARD'].includes(req.body.difficulty)
        ? req.body.difficulty
        : 'MEDIUM') as Difficulty;
      const topics: string[] = req.body.topics
        ? (Array.isArray(req.body.topics) ? req.body.topics : [req.body.topics])
        : [];

      // Extract text from all PDFs and concatenate
      const texts = await Promise.all(files.map((f) => extractTextFromPDF(f.buffer)));
      const combinedText = texts.join('\n\n');

      if (combinedText.trim().length < 100) {
        res.status(422).json({ error: 'PDF text is too short to generate questions from' });
        return;
      }

      const questions = await generateQuestionsFromText(
        combinedText,
        count,
        difficulty,
        userId,
        topics
      );

      res.status(200).json({ questions });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'NO_AI_CONFIG') {
        res.status(402).json({
          error: 'NO_AI_CONFIG',
          message: 'No AI provider configured. Please add your API key in Settings → AI Provider.',
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/mock-tests
 * Finalize and save a mock test.
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const {
      name,
      subject,
      topics,
      questions,
      difficulty,
      assignedSection,
      assignedYear,
      assignedDept,
      windowStart,
      windowEnd,
    } = req.body;

    if (!name || !subject || !topics || !questions) {
      res.status(400).json({ error: 'name, subject, topics, and questions are required' });
      return;
    }

    const test = await createMockTest({
      authorId: userId,
      name,
      subject,
      topics: Array.isArray(topics) ? topics : [topics],
      questions,
      difficulty: difficulty ?? 'MEDIUM',
      assignedSection,
      assignedYear: assignedYear ? parseInt(assignedYear, 10) : undefined,
      assignedDept,
      windowStart: windowStart ? new Date(windowStart) : undefined,
      windowEnd: windowEnd ? new Date(windowEnd) : undefined,
    });

    res.status(201).json(test);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mock-tests
 * List mock tests authored by the current user.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const tests = await getMockTestsByAuthor(userId);
    res.status(200).json(tests);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mock-tests/assigned
 * List mock tests assigned to the student's section (active window).
 */
router.get('/assigned', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      res.status(403).json({ error: 'Only students can access assigned tests' });
      return;
    }
    const tests = await getAssignedMockTests(student.year, student.section, student.department);
    res.status(200).json(tests);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mock-tests/:id
 * Get a single mock test with full question data.
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const test = await getMockTestById(req.params.id);
    if (!test) {
      res.status(404).json({ error: 'Mock test not found' });
      return;
    }
    res.status(200).json(test);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mock-tests/:id/start
 * Start a mock test attempt (creates attempt record).
 */
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const testId = req.params.id;

    // Get student ID
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      res.status(403).json({ error: 'Only students can start tests' });
      return;
    }

    const { startMockTest } = await import('../services/mockTest/mockTest');
    const attempt = await startMockTest({ testId, studentId: student.id });
    res.status(201).json(attempt);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('already exists')) {
      res.status(409).json({ error: 'Test attempt already exists' });
      return;
    }
    next(err);
  }
});

/**
 * POST /api/mock-tests/:id/submit
 * Submit a mock test attempt with answers and violations.
 */
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const testId = req.params.id;
    const { answers, timeTaken, violations } = req.body;

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ error: 'answers array is required' });
      return;
    }

    // Get student ID
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      res.status(403).json({ error: 'Only students can submit tests' });
      return;
    }

    const { submitMockTest } = await import('../services/mockTest/mockTest');
    const result = await submitMockTest({
      testId,
      studentId: student.id,
      answers,
      timeTaken: timeTaken || 0,
      violations: violations || [],
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mock-tests/:id/results
 * Get test results for all students (teacher only).
 */
router.get('/:id/results', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth!.userId;
    const testId = req.params.id;

    // Verify user is a teacher
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      res.status(403).json({ error: 'Only teachers can view test results' });
      return;
    }

    // Verify teacher owns this test
    const test = await prisma.mockTest.findUnique({ where: { id: testId } });
    if (!test || test.authorId !== userId) {
      res.status(403).json({ error: 'You can only view results for your own tests' });
      return;
    }

    const { getTestResults } = await import('../services/mockTest/mockTest');
    const results = await getTestResults(testId);
    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

export { router as mockTestRouter };
export { router as aiConfigRouter };
