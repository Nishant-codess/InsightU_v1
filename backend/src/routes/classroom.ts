import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  createClassroom,
  getTeacherClassrooms,
  getClassroomDetails,
  requestJoinClassroom,
  updateMemberStatus,
  getPendingRequests,
  createClassroomPost,
  getClassroomPosts,
  deleteClassroomPost,
  getStudentClassrooms,
  deleteClassroom,
} from '../services/classroom/classroom';
import {
  createWhiteboard,
  getTeacherWhiteboards,
  getWhiteboardDetails,
  requestJoinWhiteboard,
  updateWhiteboardMemberStatus,
  getPendingWhiteboardRequests,
  updateWhiteboardContent,
  getStudentWhiteboards,
  deleteWhiteboard,
  requestAnnotationPermission,
  updateAnnotationPermission,
} from '../services/whiteboard/whiteboard';

const router = Router();

// Configure multer for file uploads (memory storage for Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, PDFs, and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSROOM ROUTES (GCR-style)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/classroom
 * Teacher creates a new classroom
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    const { name, subject, description } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Name and subject are required' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const classroom = await createClassroom(teacher.id, name, subject, description);

    return res.status(201).json({ classroom });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/teacher
 * Get all classrooms for logged-in teacher
 */
router.get('/teacher', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const classrooms = await getTeacherClassrooms(teacher.id);

    return res.status(200).json({ classrooms });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/:classroomId
 * Get classroom details with members and posts
 */
router.get('/:classroomId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId!;
    const { classroomId } = req.params;

    const result = await getClassroomDetails(classroomId, userId);

    return res.status(200).json(result);
  } catch (error: any) {
    return next(error);
  }
});

/**
 * POST /api/classroom/join
 * Student requests to join classroom with invite code
 */
router.post('/join', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!student) {
      return res.status(403).json({ error: 'Student only' });
    }

    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const member = await requestJoinClassroom(student.id, inviteCode.toUpperCase());

    return res.status(201).json({
      message: 'Join request sent. Waiting for teacher approval.',
      member,
    });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/:classroomId/requests
 * Teacher gets pending join requests
 */
router.get('/:classroomId/requests', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const requests = await getPendingRequests(req.params.classroomId, teacher.id);

    return res.status(200).json({ requests });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * PATCH /api/classroom/:classroomId/members/:studentId
 * Teacher approves/rejects student join request
 */
router.patch('/:classroomId/members/:studentId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const member = await updateMemberStatus(
      req.params.classroomId,
      req.params.studentId,
      teacher.id,
      status
    );

    return res.status(200).json({ member });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * POST /api/classroom/:classroomId/posts
 * Teacher creates a post in classroom
 */
router.post('/:classroomId/posts', authenticate, upload.array('files', 5), async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
      select: { id: true, name: true },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const { title, content, links } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Parse links if provided
    let parsedLinks;
    if (links) {
      try {
        parsedLinks = JSON.parse(links);
      } catch {
        return res.status(400).json({ error: 'Invalid links format' });
      }
    }

    // Process uploaded files
    const files = req.files as Express.Multer.File[];
    const fileData = files?.map((file) => ({
      buffer: file.buffer,
      name: file.originalname,
      mimeType: file.mimetype,
    }));

    const post = await createClassroomPost(
      req.params.classroomId,
      teacher.id,
      teacher.name,
      content,
      title,
      parsedLinks,
      fileData
    );

    return res.status(201).json({ post });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/:classroomId/posts
 * Get all posts for a classroom
 */
router.get('/:classroomId/posts', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId!;
    const posts = await getClassroomPosts(req.params.classroomId, userId);

    return res.status(200).json({ posts });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * DELETE /api/classroom/posts/:postId
 * Teacher deletes a post
 */
router.delete('/posts/:postId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    await deleteClassroomPost(req.params.postId, teacher.id);

    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/student
 * Get all classrooms for logged-in student
 */
router.get('/student/classrooms', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!student) {
      return res.status(403).json({ error: 'Student only' });
    }

    const classrooms = await getStudentClassrooms(student.id);

    return res.status(200).json({ classrooms });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * DELETE /api/classroom/:classroomId
 * Teacher deletes/archives classroom
 */
router.delete('/:classroomId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    await deleteClassroom(req.params.classroomId, teacher.id);

    return res.status(200).json({ message: 'Classroom deleted successfully' });
  } catch (error: any) {
    return next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WHITEBOARD ROUTES (Code Sharing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/classroom/whiteboard
 * Teacher creates a new whiteboard
 */
router.post('/whiteboard', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const { title, description, classroomId } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const whiteboard = await createWhiteboard(teacher.id, title, description, classroomId);

    return res.status(201).json({ whiteboard });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/whiteboard/teacher
 * Get all whiteboards for logged-in teacher
 */
router.get('/whiteboard/teacher', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const whiteboards = await getTeacherWhiteboards(teacher.id);

    return res.status(200).json({ whiteboards });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/whiteboard/:whiteboardId
 * Get whiteboard details
 */
router.get('/whiteboard/:whiteboardId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId!;
    const result = await getWhiteboardDetails(req.params.whiteboardId, userId);

    return res.status(200).json(result);
  } catch (error: any) {
    return next(error);
  }
});

/**
 * POST /api/classroom/whiteboard/join
 * Student requests to join whiteboard with invite code
 */
router.post('/whiteboard/join', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!student) {
      return res.status(403).json({ error: 'Student only' });
    }

    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const member = await requestJoinWhiteboard(student.id, inviteCode.toUpperCase());

    return res.status(201).json({
      message: 'Join request sent. Waiting for teacher approval.',
      member,
    });
  } catch (error: any) {
    const knownErrors = [
      'Invalid invite code',
      'This whiteboard is no longer active',
      'You are already a member of this whiteboard',
      'Your request is pending approval',
      'Your request was rejected. Please contact the teacher.'
    ];
    if (knownErrors.includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * GET /api/classroom/whiteboard/:whiteboardId/requests
 * Teacher gets pending join requests for whiteboard
 */
router.get('/whiteboard/:whiteboardId/requests', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const requests = await getPendingWhiteboardRequests(req.params.whiteboardId, teacher.id);

    return res.status(200).json({ requests });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * PATCH /api/classroom/whiteboard/:whiteboardId/members/:studentId
 * Teacher approves/rejects student join request for whiteboard
 */
router.patch('/whiteboard/:whiteboardId/members/:studentId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const member = await updateWhiteboardMemberStatus(
      req.params.whiteboardId,
      req.params.studentId,
      teacher.id,
      status
    );

    return res.status(200).json({ member });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * PATCH /api/classroom/whiteboard/:whiteboardId/content
 * Update whiteboard content (Excalidraw elements)
 */
router.patch('/whiteboard/:whiteboardId/content', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId!;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const whiteboard = await updateWhiteboardContent(req.params.whiteboardId, userId, content);

    return res.status(200).json({ whiteboard });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * POST /api/classroom/whiteboard/:whiteboardId/request-annotate
 * Student requests annotation permission
 */
router.post('/whiteboard/:whiteboardId/request-annotate', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!student) {
      return res.status(403).json({ error: 'Student only' });
    }

    const member = await requestAnnotationPermission(req.params.whiteboardId, req.userAuth?.userId!);
    return res.status(200).json({ success: true, member });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * PATCH /api/classroom/whiteboard/:whiteboardId/members/:studentId/annotate
 * Teacher grants/revokes annotation permission
 */
router.patch('/whiteboard/:whiteboardId/members/:studentId/annotate', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    const { allowed } = req.body;
    if (typeof allowed !== 'boolean') {
      return res.status(400).json({ error: 'allowed boolean parameter is required' });
    }

    const member = await updateAnnotationPermission(
      req.params.whiteboardId,
      req.params.studentId,
      req.userAuth?.userId!,
      allowed
    );

    return res.status(200).json({ success: true, member });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * GET /api/classroom/whiteboard/student
 * Get all whiteboards for logged-in student
 */
router.get('/whiteboard/student/whiteboards', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!student) {
      return res.status(403).json({ error: 'Student only' });
    }

    const whiteboards = await getStudentWhiteboards(student.id);

    return res.status(200).json({ whiteboards });
  } catch (error: any) {
    return next(error);
  }
});

/**
 * DELETE /api/classroom/whiteboard/:whiteboardId
 * Teacher deletes/archives whiteboard
 */
router.delete('/whiteboard/:whiteboardId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.userAuth?.userId },
    });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher only' });
    }

    await deleteWhiteboard(req.params.whiteboardId, teacher.id);

    return res.status(200).json({ message: 'Whiteboard deleted successfully' });
  } catch (error: any) {
    return next(error);
  }
});

export default router;
