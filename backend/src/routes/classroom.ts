import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import crypto from 'crypto';

const router = Router();

// ─── Teacher: Create Classroom ────────────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    const { name, subject } = req.body;
    if (!name || !subject) return res.status(400).json({ error: 'name and subject required' });

    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found' });

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9B2C1"

    const classroom = await prisma.classroom.create({
      data: { teacherId: teacher.id, name, subject, inviteCode },
    });

    return res.status(201).json({ classroom });
  } catch (e) { return next(e); }
});

// ─── Teacher: Get My Classrooms ───────────────────────────────────────────────
router.get('/mine', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!teacher) return res.status(403).json({ error: 'Teacher only' });

    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: teacher.id, isActive: true },
      include: {
        members: { include: { student: { select: { name: true, registrationNumber: true } } } },
        sketchBoards: { select: { id: true, title: true, isLive: true, shareToken: true, updatedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ classrooms });
  } catch (e) { return next(e); }
});

// ─── Teacher: Approve / Reject Member ────────────────────────────────────────
router.patch('/:classroomId/members/:memberId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!teacher) return res.status(403).json({ error: 'Teacher only' });

    const { status } = req.body; // APPROVED | REJECTED
    if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });

    const member = await prisma.classroomMember.update({
      where: { id: req.params.memberId },
      data: { status },
    });

    return res.status(200).json({ member });
  } catch (e) { return next(e); }
});

// ─── Student: Join Classroom by Invite Code ───────────────────────────────────
router.post('/join', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!student) return res.status(403).json({ error: 'Student only' });

    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'inviteCode required' });

    const classroom = await prisma.classroom.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
    if (!classroom || !classroom.isActive) return res.status(404).json({ error: 'Invalid or inactive invite code' });

    // Check already member
    const existing = await prisma.classroomMember.findUnique({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId: student.id } },
    });
    if (existing) return res.status(200).json({ message: `Already ${existing.status.toLowerCase()}`, member: existing });

    const member = await prisma.classroomMember.create({
      data: { classroomId: classroom.id, studentId: student.id, status: 'PENDING' },
    });

    return res.status(201).json({ message: 'Join request sent. Waiting for teacher approval.', member });
  } catch (e) { return next(e); }
});

// ─── Student: Get My Classrooms ───────────────────────────────────────────────
router.get('/student/mine', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!student) return res.status(403).json({ error: 'Student only' });

    const memberships = await prisma.classroomMember.findMany({
      where: { studentId: student.id },
      include: {
        classroom: {
          include: {
            teacher: { select: { name: true } },
            sketchBoards: {
              where: { isLive: true },
              select: { id: true, title: true, shareToken: true },
            },
          },
        },
      },
    });

    return res.status(200).json({ memberships });
  } catch (e) { return next(e); }
});

// ─── Teacher: Create Sketch Board ────────────────────────────────────────────
router.post('/:classroomId/boards', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.userAuth?.userId } });
    if (!teacher) return res.status(403).json({ error: 'Teacher only' });

    const { title } = req.body;
    const shareToken = crypto.randomBytes(12).toString('hex');

    const board = await prisma.sketchBoard.create({
      data: {
        classroomId: req.params.classroomId,
        title: title || 'Untitled Board',
        shareToken,
        isLive: true,
      },
    });

    return res.status(201).json({ board });
  } catch (e) { return next(e); }
});

// ─── Anyone: Get Sketch Board by shareToken ───────────────────────────────────
router.get('/board/:shareToken', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const board = await prisma.sketchBoard.findUnique({
      where: { shareToken: req.params.shareToken },
      include: { classroom: { select: { name: true, subject: true } } },
    });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    return res.status(200).json({ board });
  } catch (e) { return next(e); }
});

// ─── Teacher: Save Board Data ─────────────────────────────────────────────────
router.patch('/board/:shareToken', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { data, isLive } = req.body;
    const board = await prisma.sketchBoard.update({
      where: { shareToken: req.params.shareToken },
      data: { ...(data !== undefined && { data }), ...(isLive !== undefined && { isLive }) },
    });
    return res.status(200).json({ board });
  } catch (e) { return next(e); }
});

export default router;
