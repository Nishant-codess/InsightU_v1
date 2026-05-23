import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/holidays - View all holidays
router.get('/', authenticate, async (_req, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      include: {
        createdBy: {
          select: { role: true }
        }
      }
    });
    res.json(holidays);
  } catch (error) {
    next(error);
  }
});

// POST /api/holidays - Add a new holiday (Teacher or Admin only)
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.userAuth?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Only teachers and admins can add holidays' });
      return;
    }

    const { title, date, description } = req.body;
    if (!title || !date) {
      res.status(400).json({ error: 'Title and date are required' });
      return;
    }

    const holiday = await prisma.holiday.create({
      data: {
        title,
        date: new Date(date),
        description: description || null,
        createdById: req.userAuth!.userId,
      },
    });

    res.status(201).json(holiday);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/holidays/:id - Delete a holiday (Teacher or Admin only)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.userAuth?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Only teachers and admins can delete holidays' });
      return;
    }

    const { id } = req.params;

    await prisma.holiday.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
