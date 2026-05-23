import { Router, Response, NextFunction } from 'express';
import Groq from 'groq-sdk';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'MOCK_API_KEY' });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: Extract text from file buffers
async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString('utf-8');
}

// GET /api/ai-quiz/references - Fetch lecture notes and sample papers for quiz context
router.get('/references', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lectureNotes = await prisma.lectureNote.findMany({
      select: { id: true, title: true, topic: true, subject: true }
    });
    const samplePapers = await prisma.samplePaper.findMany({
      select: { id: true, subject: true }
    });
    res.json({ lectureNotes, samplePapers });
  } catch (err) {
    console.error('References Fetch Error:', err);
    next(err);
  }
});

// POST /api/ai-quiz/generate-test - AI-powered test generation with references and patterns
router.post('/generate-test', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, topics, count = 10, difficulty = 'medium', referenceId, referenceType, pattern } = req.body;
    let { localContent } = req.body;

    if (!subject || !topics) {
      res.status(400).json({ error: 'Subject and topics are required' });
      return;
    }

    if (req.file) {
      try {
        localContent = await extractText(req.file.buffer, req.file.mimetype);
      } catch (err) {
        console.error('File Parsing Error:', err);
      }
    }

    let referenceContext = '';
    if (referenceId && referenceType && referenceId !== 'upload') {
      if (referenceType === 'lecture') {
        const note = await prisma.lectureNote.findUnique({ where: { id: referenceId } });
        if (note) referenceContext = `Reference Material: Lecture Note "${note.title}" on Topic "${note.topic}".\n`;
      } else if (referenceType === 'sample') {
        const paper = await prisma.samplePaper.findUnique({ where: { id: referenceId } });
        if (paper) referenceContext = `Reference Material: Sample Paper for Subject "${paper.subject}".\n`;
      }
    }

    if (localContent) {
      referenceContext += `Local Uploaded Context (Extracted): ${localContent.substring(0, 8000)}\n`;
    }

    let searchContext = '';
    if (!referenceId && !localContent) {
      const relatedNotes = await prisma.lectureNote.findMany({
        where: {
          OR: [
            { subject: { contains: subject, mode: 'insensitive' } },
            { topic: { contains: topics, mode: 'insensitive' } }
          ]
        },
        include: { annotations: { take: 5 } }
      });
      searchContext = relatedNotes.map(n => `Note: ${n.title} (${n.topic})\nAnnotations: ${n.annotations.map(a => a.content).join(', ')}`).join('\n');
    }

    // Fallback Mock Quiz Generator if API Key is not set
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'MOCK_API_KEY') {
      console.warn('[AIQuiz] Using Mock Quiz Generator because GROQ_API_KEY is not set');
      const numQuestions = parseInt(count) || 5;
      const questions = [];
      for (let i = 1; i <= numQuestions; i++) {
        if (i % 2 === 1) {
          questions.push({
            type: 'MCQ',
            question: `Mock MCQ Question ${i} about ${topics} (${subject}): Which option is correct?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answer: 'Option A',
            explanation: 'This is a fallback mock explanation for Option A.'
          });
        } else {
          questions.push({
            type: 'SHORT',
            question: `Mock Short Question ${i} about ${topics} (${subject}): Explain the core concept.`,
            idealAnswer: 'The core concept involves standard academic practices.',
            explanation: 'This is a mock explanation for the short question.'
          });
        }
      }
      res.json({
        title: `AI Generated ${subject} Quiz (Mock)`,
        questions,
        subject,
        timePerQuestion: difficulty === 'hard' ? 90 : 60
      });
      return;
    }

    const systemPrompt = `You are a high-level academic assessor. Generate a professional test.
    SUBJECT: ${subject}
    TOPICS: ${topics}
    DIFFICULTY: ${difficulty}
    ${referenceContext ? 'USE THIS SPECIFIC CONTEXT:\n' + referenceContext : 'GENERAL CONTEXT:\n' + searchContext}
    CUSTOM PATTERN: ${pattern || 'Generate exactly ' + count + ' Multiple Choice Questions.'}
    STRICT JSON OUTPUT RULES:
    1. Every question must have a "type" field: "MCQ" or "SHORT".
    2. For "MCQ": include "options" (array[4]), "answer" (exact string from options), and "explanation".
    3. For "SHORT": include "idealAnswer" (1-2 sentence detailed answer) and "explanation".
    4. Provide a creative "title" for the assessment.
    Return JSON format:
    { "title": "", "questions": [ { "type": "MCQ", "question": "", "options": [], "answer": "", "explanation": "" } ] }`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate the assessment JSON now.' }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4096
    });

    const response = JSON.parse(chatCompletion.choices[0]?.message?.content || '{"questions": []}');
    res.json({ ...response, subject, timePerQuestion: difficulty === 'hard' ? 90 : 60 });
  } catch (err) {
    console.error('Generation Error:', err);
    next(err);
  }
});

// POST /api/ai-quiz/grade - Grade short answers using AI
router.post('/grade', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      res.json({ results: [] });
      return;
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'MOCK_API_KEY') {
      console.warn('[AIQuiz] Using Mock Grading because GROQ_API_KEY is not set');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = responses.map((r: any) => ({
        score: r.answer && r.answer.length > 5 ? 1 : 0,
        feedback: 'Mock grading: Feedback generated dynamically.'
      }));
      res.json({ results });
      return;
    }

    const prompt = `Evaluate these student answers.
      - Score 1 for correct concepts.
      - Score 0 for gibberish, incorrect, or "I don't know" style answers.
      - 1 sentence feedback.
      DATA: ${JSON.stringify(responses)}
      RETURN ONLY RAW JSON: { "results": [ { "score": 0|1, "feedback": "" } ] }`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a fast grading bot. Return valid JSON only, no markdown.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 2048
    });

    try {
      const content = chatCompletion.choices[0]?.message?.content || '{"results": []}';
      const result = JSON.parse(content);
      res.json(result);
    } catch (parseErr) {
      console.error('JSON Parse Error during grading:', parseErr);
      res.json({
        results: responses.map(() => ({ score: 0, feedback: 'Grading system busy. Please review manually.' }))
      });
    }
  } catch (err) {
    console.error('Grading Error:', err);
    next(err);
  }
});

// POST /api/ai-quiz/save-result - Persistent history for AI quizzes
router.post('/save-result', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, topic, score, totalQuestions, status = 'COMPLETED', details } = req.body;

    if (!req.userAuth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.userAuth.userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }

    const performance = await prisma.studentPerformance.create({
      data: {
        studentId: student.id,
        subject,
        topic,
        assessmentType: 'AI_GENERATED',
        score: parseFloat(score),
        maxScore: parseFloat(totalQuestions),
        percentage: (score / totalQuestions) * 100,
        status,
        details: details || {},
        assessmentDate: new Date(),
      }
    });

    res.json(performance);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai-quiz/history - Fetch recent AI quiz results
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userAuth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.userAuth.userId } });
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const history = await prisma.studentPerformance.findMany({
      where: { studentId: student.id, assessmentType: 'AI_GENERATED' },
      orderBy: { assessmentDate: 'desc' },
      take: 10
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
