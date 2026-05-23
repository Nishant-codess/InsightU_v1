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

// Temporary endpoint to seed 2026-27 ODD semester from official PDF
router.get('/seed-odd-sem', async (_req, res) => {
  try {
    const entries: { date: Date; dayOrder: number | null; name: string | null }[] = [
      // July 2026
      { date: new Date('2026-07-21T00:00:00Z'), dayOrder: 1, name: 'Commencement of Classes' },
      { date: new Date('2026-07-22T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-07-23T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-07-24T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-07-27T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-07-28T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-07-29T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-07-30T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-07-31T00:00:00Z'), dayOrder: 4, name: null },

      // August 2026
      { date: new Date('2026-08-03T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-08-04T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-08-05T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-08-06T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-08-07T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-08-10T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-08-11T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-08-12T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-08-13T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-08-14T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-08-15T00:00:00Z'), dayOrder: null, name: 'Independence Day' },
      { date: new Date('2026-08-17T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-08-18T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-08-19T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-08-20T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-08-21T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-08-24T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-08-25T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-08-26T00:00:00Z'), dayOrder: null, name: 'Milad - un - Nabi' },
      { date: new Date('2026-08-27T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-08-28T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-08-31T00:00:00Z'), dayOrder: 4, name: null },

      // September 2026
      { date: new Date('2026-09-01T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-09-02T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-09-03T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-09-04T00:00:00Z'), dayOrder: null, name: 'Krishna Jayanthi' },
      { date: new Date('2026-09-07T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-09-08T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-09-09T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-09-10T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-09-11T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-09-14T00:00:00Z'), dayOrder: null, name: 'Vinayakar Chathurthi' },
      { date: new Date('2026-09-15T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-09-16T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-09-17T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-09-18T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-09-21T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-09-22T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-09-23T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-09-24T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-09-25T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-09-28T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-09-29T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-09-30T00:00:00Z'), dayOrder: 4, name: null },

      // October 2026
      { date: new Date('2026-10-01T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-10-02T00:00:00Z'), dayOrder: null, name: 'Gandhi Jayanthi' },
      { date: new Date('2026-10-05T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-10-06T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-10-07T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-10-08T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-10-09T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-10-12T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-10-13T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-10-14T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-10-15T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-10-16T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-10-19T00:00:00Z'), dayOrder: null, name: 'Ayutha Pooja' },
      { date: new Date('2026-10-20T00:00:00Z'), dayOrder: null, name: 'Vijaya Dasami' },
      { date: new Date('2026-10-21T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-10-22T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-10-23T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-10-26T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-10-27T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-10-28T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-10-29T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-10-30T00:00:00Z'), dayOrder: 3, name: null },

      // November 2026
      { date: new Date('2026-11-02T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-11-03T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-11-04T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-11-05T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-11-06T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-11-08T00:00:00Z'), dayOrder: null, name: 'Deepavali' },
      { date: new Date('2026-11-09T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-11-10T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-11-11T00:00:00Z'), dayOrder: 1, name: null },
      { date: new Date('2026-11-12T00:00:00Z'), dayOrder: 2, name: null },
      { date: new Date('2026-11-13T00:00:00Z'), dayOrder: 3, name: null },
      { date: new Date('2026-11-16T00:00:00Z'), dayOrder: 4, name: null },
      { date: new Date('2026-11-17T00:00:00Z'), dayOrder: 5, name: null },
      { date: new Date('2026-11-18T00:00:00Z'), dayOrder: 1, name: 'Last Working Day' },
    ];

    // Check if we already seeded to avoid duplication errors
    const existing = await prisma.calendarDay.findFirst({
      where: { date: new Date('2026-07-21T00:00:00Z') }
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
      res.json({ message: `Successfully seeded ${entries.length} official day orders for the 26-27 ODD Semester (July to November)!`, entries });
    } else {
      res.json({ message: 'Odd semester data from official PDF is already seeded.', existing });
    }
  } catch (error) {
    console.error('Error seeding odd sem:', error);
    res.status(500).json({ error: 'Failed to seed odd sem' });
  }
});

export default router;
