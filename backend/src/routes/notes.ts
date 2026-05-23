import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToSupabase } from '../config/supabase';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// GET /api/notes - Get all lecture notes for a classroom
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classroomId = String(req.query.classroomId ?? '').trim();
    if (!classroomId) {
      res.status(400).json({ error: 'classroomId is required' });
      return;
    }

    const userId = req.userAuth?.userId;
    const role = req.userAuth?.role;

    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) { res.status(403).json({ error: 'Student profile not found' }); return; }

      const membership = await prisma.classroomMember.findFirst({
        where: { classroomId, studentId: student.id, status: 'APPROVED' }
      });
      if (!membership) { res.status(403).json({ error: 'Access denied: not a member of this classroom' }); return; }
    } else if (role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher) { res.status(403).json({ error: 'Teacher profile not found' }); return; }

      const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, teacherId: teacher.id } });
      if (!classroom) { res.status(403).json({ error: 'Access denied: you do not teach this classroom' }); return; }
    }

    const notes = await prisma.lectureNote.findMany({
      where: { classroomId },
      orderBy: { uploadedAt: 'desc' },
      include: { teacher: { select: { name: true } } }
    });

    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// POST /api/notes/upload - Teacher uploads lecture notes
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can upload lecture notes' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const { title, subject, topic, description, lectureDate, classroomId } = req.body;
    if (!title || !subject || !topic || !classroomId) {
      res.status(400).json({ error: 'title, subject, topic and classroomId are required' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth.userId } });
    if (!teacher) {
      res.status(403).json({ error: 'Teacher profile not found' });
      return;
    }

    const uploadResult = await uploadToSupabase(
      req.file.buffer,
      req.file.originalname,
      'lecture-notes',
      req.file.mimetype
    );

    const note = await prisma.lectureNote.create({
      data: {
        title: String(title),
        subject: String(subject),
        topic: String(topic),
        description: description ? String(description) : null,
        lectureDate: lectureDate ? new Date(String(lectureDate)) : new Date(),
        fileUrl: uploadResult.url,
        fileType: req.file.mimetype,
        teacherId: teacher.id,
        classroomId: String(classroomId)
      }
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/:noteId/annotations - Fetch note annotations for a student
router.get('/:noteId/annotations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    const annotations = await prisma.noteAnnotation.findMany({
      where: { noteId: req.params.noteId, studentId: student.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json(annotations);
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:noteId/annotations - Create or edit note annotations
router.post('/:noteId/annotations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, page, positionX, positionY } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    const annotation = await prisma.noteAnnotation.create({
      data: {
        studentId: student.id,
        noteId: req.params.noteId,
        content: String(content),
        page: page ? parseInt(page) : null,
        positionX: positionX ? parseFloat(positionX) : null,
        positionY: positionY ? parseFloat(positionY) : null,
      }
    });

    res.status(201).json(annotation);
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:noteId/bookmark - Check if bookmarked
router.get('/:noteId/bookmark', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    const bookmark = await prisma.noteBookmark.findUnique({
      where: { studentId_noteId: { studentId: student.id, noteId: req.params.noteId } }
    });

    res.json({ bookmarked: !!bookmark });
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:noteId/bookmark - Toggle bookmark
router.post('/:noteId/bookmark', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!student) {
      res.status(403).json({ error: 'Student profile not found' });
      return;
    }

    const noteId = req.params.noteId;
    const bookmarkKey = { studentId: student.id, noteId };
    const existing = await prisma.noteBookmark.findUnique({ where: { studentId_noteId: bookmarkKey } });

    if (existing) {
      await prisma.noteBookmark.delete({ where: { studentId_noteId: bookmarkKey } });
      res.json({ bookmarked: false });
    } else {
      await prisma.noteBookmark.create({ data: { studentId: student.id, noteId } });
      res.json({ bookmarked: true });
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:noteId - Teacher deletes a note
router.delete('/:noteId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.userAuth?.role !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can delete notes' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth.userId } });
    if (!teacher) {
      res.status(403).json({ error: 'Teacher profile not found' });
      return;
    }

    const note = await prisma.lectureNote.findUnique({ where: { id: req.params.noteId } });
    if (!note || note.teacherId !== teacher.id) {
      res.status(404).json({ error: 'Note not found or unauthorized' });
      return;
    }

    await prisma.lectureNote.delete({ where: { id: req.params.noteId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
