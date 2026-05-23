import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToSupabase } from '../config/supabase';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// GET /api/papers - Get all sample papers
router.get('/', authenticate, async (_req, res: Response, next: NextFunction): Promise<void> => {
  try {
    const papers = await prisma.samplePaper.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { role: true }
        }
      }
    });
    // Add uploader info based on role
    const papersWithName = await Promise.all(papers.map(async (paper) => {
      let uploaderName = 'Unknown';
      try {
        if (paper.uploadedBy.role === 'TEACHER') {
          const teacher = await prisma.teacher.findUnique({
            where: { userId: paper.uploadedById },
            select: { name: true }
          });
          uploaderName = teacher?.name || 'Teacher';
        } else if (paper.uploadedBy.role === 'ADMIN') {
          const admin = await prisma.admin.findUnique({
            where: { userId: paper.uploadedById },
            select: { name: true }
          });
          uploaderName = admin?.name || 'Admin';
        }
      } catch { /* ignore */ }
      return {
        ...paper,
        uploadedBy: { name: uploaderName }
      };
    }));
    res.json(papersWithName);
  } catch (error) {
    next(error);
  }
});

// POST /api/papers/upload - Upload a new sample paper (Teacher or Admin only)
router.post('/upload', authenticate, upload.single('paper'), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.userAuth?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Only teachers and admins can upload sample papers' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded or invalid file type' });
      return;
    }

    const { subject } = req.body;
    if (!subject) {
      res.status(400).json({ error: 'Subject is required' });
      return;
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabase(
      req.file.buffer,
      req.file.originalname,
      'sample-papers',
      req.file.mimetype
    );

    const paper = await prisma.samplePaper.create({
      data: {
        subject,
        fileUrl: uploadResult.url,
        uploadedById: req.userAuth!.userId,
      },
    });

    res.status(201).json(paper);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/papers/:id - Delete a sample paper (Teacher or Admin only)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.userAuth?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Only teachers and admins can delete sample papers' });
      return;
    }

    await prisma.samplePaper.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
