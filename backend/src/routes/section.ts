import { Router } from 'express';
import { getSectionDetails, getSectionPosts, createSectionPost, getTeacherSections } from '../services/user/section';

const router = Router();

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

export default router;
