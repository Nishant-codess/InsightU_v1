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

// Temporary endpoint to seed July and August 2026 for testing ODD semester
router.get('/seed-odd-sem', async (_req, res) => {
  try {
    let currentDayOrder = 1;
    const entries: { date: Date; dayOrder: number | null; name: string | null }[] = [];
    
    // July 2026 (Starts on Wednesday July 1st)
    for (let day = 1; day <= 31; day++) {
      const d = new Date(Date.UTC(2026, 6, day)); // 6 = July
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) { // Skip weekends
        entries.push({ date: d, dayOrder: currentDayOrder, name: null });
        currentDayOrder = currentDayOrder === 5 ? 1 : currentDayOrder + 1;
      }
    }
    
    // August 2026
    for (let day = 1; day <= 31; day++) {
      const d = new Date(Date.UTC(2026, 7, day)); // 7 = August
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) {
        if (day === 15) {
          entries.push({ date: d, dayOrder: null, name: 'Independence Day' });
        } else {
          entries.push({ date: d, dayOrder: currentDayOrder, name: null });
          currentDayOrder = currentDayOrder === 5 ? 1 : currentDayOrder + 1;
        }
      }
    }

    // Skip inserting if they already exist
    const existing = await prisma.calendarDay.findFirst({
      where: { date: { gte: new Date('2026-07-01') } }
    });

    if (!existing) {
      await prisma.calendarDay.createMany({
        data: entries.map(e => ({
          date: e.date,
          dayOrder: e.dayOrder,
          name: e.name,
          version: 1,
          isActive: true,
        })),
        skipDuplicates: true
      });
      res.json({ message: `Successfully seeded ${entries.length} day orders for July/August 2026!`, entries });
    } else {
      res.json({ message: 'Odd semester data already seeded.', existing });
    }
  } catch (error) {
    console.error('Error seeding odd sem:', error);
    res.status(500).json({ error: 'Failed to seed odd sem' });
  }
});

export default router;
