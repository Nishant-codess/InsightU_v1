import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/student/profile
 * Returns student profile from DB (basic info only)
 */
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        course: true,
        department: true,
        branch: true,
        year: true,
        section: true,
        batch: true,
        collegeMailId: true,
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    return res.json({ student });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/student/classrooms
 * Returns classrooms the student is a member of
 */
router.get('/classrooms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const memberships = await prisma.classroomMember.findMany({
      where: { studentId: student.id },
      include: {
        classroom: {
          include: {
            teacher: { select: { name: true } },
            _count: { select: { members: true, posts: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return res.json({ classrooms: memberships });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
