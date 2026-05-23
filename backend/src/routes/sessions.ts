import { Router, Response, Request, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import multer from 'multer';


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos and PDFs
});

const router = Router();

// GET /api/sessions/active - Fetch all active sessions for discovery (Student)
router.get('/active', authenticate, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await prisma.liveSession.findFirst({
      where: { isActive: true },
      include: {
        teacher: {
          select: {
            name: true,
            department: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    if (!session) {
      res.json(null);
      return;
    }

    res.json({
      session_id: session.id,
      id: session.id,
      title: session.title,
      teacher_name: session.teacher.name,
      created_at: session.startTime,
      status: 'active'
    });
  } catch (err) {
    console.error('[Sessions] getActiveSessions Error:', err);
    next(err);
  }
});

// POST /api/sessions/join - Log student joining a session
router.post('/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { session_id } = req.body;
    const userId = req.userAuth!.userId;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    await prisma.liveSessionParticipant.upsert({
      where: {
        sessionId_studentId: { sessionId: session_id, studentId: student.id }
      },
      update: { joinedAt: new Date() },
      create: { sessionId: session_id, studentId: student.id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Sessions] joinSession Error:', err);
    next(err);
  }
});

// GET /api/sessions/:id/content - Fetch current state of the board/notes
router.get('/:id/content', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await prisma.liveSession.findUnique({
      where: { id },
      select: {
        currentContent: true,
        title: true,
        isActive: true
      }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
      success: true,
      content: session.currentContent || {},
      title: session.title,
      status: session.isActive ? 'active' : 'ended'
    });
  } catch (err) {
    console.error('[Sessions] getSessionContent Error:', err);
    next(err);
  }
});

// POST /api/sessions - Start a live session (Teacher only)
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, classroomId } = req.body;
    const userId = req.userAuth!.userId;

    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can start live sessions' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      res.status(404).json({ error: 'Teacher profile not found' });
      return;
    }

    // ENFORCE SINGLE ACTIVE SESSION: End all other active sessions for this teacher
    await prisma.liveSession.updateMany({
      where: { teacherId: teacher.id, isActive: true },
      data: { isActive: false, endTime: new Date() }
    });

    const session = await prisma.liveSession.create({
      data: {
        teacherId: teacher.id,
        classroomId: classroomId || undefined,
        title: title || 'Live Teaching Session',
        isActive: true,
        startTime: new Date()
      }
    });

    res.json({
      success: true,
      session_id: session.id,
      id: session.id
    });
  } catch (err) {
    console.error('[Sessions] createSession Error:', err);
    next(err);
  }
});

import fs from 'fs';
import path from 'path';

// POST /api/sessions/upload - Upload files (PDF/Video) for a live session
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can upload files to live sessions' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${sanitizedOriginalName}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, req.file.buffer);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const backendUrl = `${protocol}://${host}`;
    res.json({ success: true, url: `${backendUrl}/uploads/${fileName}` });
  } catch (err) {
    console.error('[Sessions] upload Error:', err);
    next(err);
  }
});

// PATCH /api/sessions/:id/end - End a live session (Teacher only)
router.patch('/:id/end', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userAuth!.userId;

    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can end live sessions' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      res.status(404).json({ error: 'Teacher profile not found' });
      return;
    }

    const session = await prisma.liveSession.update({
      where: { id },
      data: { isActive: false, endTime: new Date() }
    });

    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

export default router;
