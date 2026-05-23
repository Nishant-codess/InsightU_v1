import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToSupabase } from '../config/supabase';
import { StudentNoteStatus } from '@prisma/client';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// POST /api/student-notes/upload - Student uploads notes for approval
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'STUDENT') {
      res.status(403).json({ error: 'Only students can upload study notes' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const { title, classroomId, date } = req.body;
    if (!title || !classroomId) {
      res.status(400).json({ error: 'title and classroomId are required' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.userAuth.userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) {
      res.status(404).json({ error: 'Classroom not found' });
      return;
    }

    const uploadResult = await uploadToSupabase(
      req.file.buffer,
      req.file.originalname,
      'student-notes',
      req.file.mimetype
    );

    const studentNote = await prisma.studentNote.create({
      data: {
        title: String(title),
        fileUrl: uploadResult.url,
        studentId: student.id,
        classroomId: String(classroomId),
        teacherId: classroom.teacherId,
        status: StudentNoteStatus.PENDING,
        date: date ? new Date(date) : null,
      }
    });

    res.status(201).json(studentNote);
  } catch (error) {
    next(error);
  }
});

// GET /api/student-notes/my - Get all notes uploaded by logged-in student
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'STUDENT') {
      res.status(403).json({ error: 'Access denied: not a student' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.userAuth.userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    const notes = await prisma.studentNote.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: {
        classroom: { select: { id: true, name: true, subject: true } }
      }
    });

    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// GET /api/student-notes/classroom/:classroomId - Get approved notes for a classroom
router.get('/classroom/:classroomId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { classroomId } = req.params;
    const notes = await prisma.studentNote.findMany({
      where: { classroomId, status: StudentNoteStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { name: true } } }
    });
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// GET /api/student-notes/review - Teacher reviews pending notes submissions
router.get('/review', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Access denied: not a teacher' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth.userId } });
    if (!teacher) {
      res.status(403).json({ error: 'Teacher profile not found' });
      return;
    }

    const notes = await prisma.studentNote.findMany({
      where: { status: StudentNoteStatus.PENDING, teacherId: teacher.id },
      include: {
        student: { select: { name: true, registrationNumber: true } },
        classroom: { select: { name: true, subject: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/student-notes/:id - Teacher approves or rejects a note
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Access denied: not a teacher' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth.userId } });
    if (!teacher) {
      res.status(403).json({ error: 'Teacher profile not found' });
      return;
    }

    const { status } = req.body;
    if (status !== StudentNoteStatus.APPROVED && status !== StudentNoteStatus.REJECTED) {
      res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
      return;
    }

    const existing = await prisma.studentNote.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.teacherId !== teacher.id) {
      res.status(404).json({ error: 'Student note not found for this teacher' });
      return;
    }

    const updated = await prisma.studentNote.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// GET /api/student-notes/:noteId/annotations - Get annotations on student note
router.get('/:noteId/annotations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const annotations = await prisma.annotation.findMany({
      where: { noteId: req.params.noteId, userId: req.userAuth!.userId },
      orderBy: { timestamp: 'asc' }
    });
    res.json(annotations);
  } catch (err) {
    next(err);
  }
});

// POST /api/student-notes/:noteId/annotations - Create annotation on student note
router.post('/:noteId/annotations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, quote, position } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const annotation = await prisma.annotation.create({
      data: {
        userId: req.userAuth!.userId,
        noteId: req.params.noteId,
        content: String(content),
        quote: quote ? String(quote) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position: position ? (position as any) : null,
      }
    });

    res.status(201).json(annotation);
  } catch (err) {
    next(err);
  }
});

export default router;
