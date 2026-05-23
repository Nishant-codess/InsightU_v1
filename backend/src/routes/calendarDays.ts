import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get all calendar days
router.get('/', authenticate, async (_req, res) => {
  try {
    const days = await prisma.calendarDay.findMany({
      orderBy: { date: 'asc' },
    });
    res.json(days);
  } catch (error) {
    console.error('Error fetching calendar days:', error);
    res.status(500).json({ error: 'Failed to fetch calendar days' });
  }
});

export default router;
