import { Router } from 'express';
import multer from 'multer';
import { getSectionDetails, getSectionPosts, createSectionPost, getTeacherSections, createPost, getPosts, addComment, getPostComments, assertMembership } from '../services/user/section';
import { authenticate, AuthRequest } from '../middleware/auth';
import { storeFile } from '../services/notes/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Req: Get section details (classmates, teachers)
router.get('/details/:studentId', async (req, res, next) => {
  try {
    const details = await getSectionDetails(req.params.studentId);
    res.json(details);
  } catch (error) {
    next(error);
  }
});

// Req: Get section feed
router.get('/posts/:year/:section/:department', async (req, res, next) => {
  try {
    const { year, section, department } = req.params;
    const posts = await getSectionPosts(parseInt(year), section, department);
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

// Req: Create a post
router.post('/posts', async (req, res, next) => {
  try {
    const { userId, role, data } = req.body;
    const post = await createSectionPost(userId, role, data);
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

// Req: Get teacher assignments
router.get('/teacher/:teacherId', async (req, res, next) => {
  try {
    const sections = await getTeacherSections(req.params.teacherId);
    res.json(sections);
  } catch (error) {
    next(error);
  }
});

// ─── Section Feed Routes (Task 16) ───────────────────────────────────────────

// POST /api/section/feed/posts — create a post (with optional file attachments)
router.post('/feed/posts', authenticate, upload.array('attachments', 10), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userAuth!.userId;
    const { sectionKey, content } = req.body;

    if (!sectionKey || !content) {
      res.status(400).json({ error: 'sectionKey and content are required' });
      return;
    }

    await assertMembership(userId, sectionKey);

    // Upload any attached files
    const files = (req.files as Express.Multer.File[]) || [];
    const attachmentUrls: string[] = [];
    for (const file of files) {
      const { fileUrl } = await storeFile(file.buffer, file.originalname, file.mimetype);
      attachmentUrls.push(fileUrl);
    }

    const post = await createPost(userId, sectionKey, content, attachmentUrls);
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

// GET /api/section/feed/posts — get posts for a section (cursor pagination)
router.get('/feed/posts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userAuth!.userId;
    const { sectionKey, cursor } = req.query as { sectionKey?: string; cursor?: string };

    if (!sectionKey) {
      res.status(400).json({ error: 'sectionKey query param is required' });
      return;
    }

    await assertMembership(userId, sectionKey);
    const posts = await getPosts(sectionKey, cursor);
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

// POST /api/section/feed/posts/:postId/comments — add a comment
router.post('/feed/posts/:postId/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userAuth!.userId;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const comment = await addComment(postId, userId, content);
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// GET /api/section/feed/posts/:postId/comments — get comments for a post
router.get('/feed/posts/:postId/comments', authenticate, async (_req: AuthRequest, res, next) => {
  try {
    const { postId } = _req.params;
    const comments = await getPostComments(postId);
    res.json(comments);
  } catch (error) {
    next(error);
  }
});

export default router;
