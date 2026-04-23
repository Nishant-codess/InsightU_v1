import { Router } from 'express';
import multer from 'multer';
import { 
    uploadCalendar, 
    uploadUnifiedTimetable,
    syncSectionTimetable
} from '../services/timetable/timetable';
import { listUsers, updateUser, deleteUser } from '../services/admin/user_mgmt';
import prisma from '../config/database';
import moment from 'moment-timezone';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Req 22.1–22.5: Admin Academic Calendar JSON upload ──────────────────────
// Accepts a JSON body mapping ISO date strings → Day Order (1–5) or "Holiday".
// Validates all entries and rejects the upload if any are invalid.
router.post('/calendar', async (req, res, next) => {
    try {
        const body = req.body;

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ error: 'Request body must be a JSON object.' });
        }

        const invalidEntries: { key: string; value: unknown; reason: string }[] = [];
        const validEntries: { date: Date; dayOrder: number | null; name: string | null }[] = [];

        for (const [key, value] of Object.entries(body)) {
            // Validate key: must be a valid ISO date string (YYYY-MM-DD)
            const dateMs = Date.parse(key);
            if (isNaN(dateMs) || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
                invalidEntries.push({ key, value, reason: 'Key is not a valid ISO date string (YYYY-MM-DD).' });
                continue;
            }

            // Validate value: integer 1–5 or the string "Holiday"
            if (value === 'Holiday') {
                validEntries.push({ date: new Date(key), dayOrder: null, name: 'Holiday' });
            } else if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) {
                validEntries.push({ date: new Date(key), dayOrder: value, name: null });
            } else {
                invalidEntries.push({ key, value, reason: 'Value must be an integer 1–5 or the string "Holiday".' });
            }
        }

        if (invalidEntries.length > 0) {
            return res.status(422).json({
                error: 'Calendar upload rejected due to invalid entries.',
                invalidEntries,
            });
        }

        if (validEntries.length === 0) {
            return res.status(400).json({ error: 'Calendar JSON contains no entries.' });
        }

        // Determine next version
        const latest = await prisma.calendarDay.findFirst({ orderBy: { version: 'desc' } });
        const nextVersion = (latest?.version ?? 0) + 1;

        // Transaction: deactivate old calendar, insert new one
        await prisma.$transaction([
            prisma.calendarDay.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            }),
            prisma.calendarDay.createMany({
                data: validEntries.map((e) => ({
                    date: e.date,
                    dayOrder: e.dayOrder,
                    name: e.name,
                    version: nextVersion,
                    isActive: true,
                })),
            }),
        ]);

        return res.status(200).json({
            message: `Academic calendar uploaded successfully. ${validEntries.length} entries stored (version ${nextVersion}).`,
            entryCount: validEntries.length,
            version: nextVersion,
        });
    } catch (error) {
        return next(error);
    }
});

// Req: Upload Academic Calendar (Deterministic)
router.post('/calendar/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
        } else {
            await uploadCalendar(req.file);
            res.status(200).json({ message: 'Academic Calendar uploaded successfully' });
        }
    } catch (error) {
        next(error);
    }
});

// Req: Get Current Calendar Status (Deterministic)
router.get('/calendar/status', async (_req, res, next) => {
    try {
        const latest = await prisma.calendarDay.findFirst({ 
            where: { isActive: true } 
        });
        
        // Find today's day order using Asia/Kolkata
        const nowKolkata = moment().tz("Asia/Kolkata");
        const dateStr = nowKolkata.format("YYYY-MM-DD");
        
        const todayEntry = await prisma.calendarDay.findFirst({
            where: { 
                date: new Date(dateStr), 
                isActive: true 
            }
        });

        res.status(200).json({
            active: !!latest,
            isSynced: !!latest,
            currentDayOrder: todayEntry?.dayOrder ?? null,
            dayName: todayEntry?.name || (todayEntry ? `Day ${todayEntry.dayOrder}` : "Not Synced"),
            isHoliday: todayEntry ? todayEntry.dayOrder === null : true,
            version: latest?.version || 0
        });
    } catch (error) {
        next(error);
    }
});

// Req: Upload Unified Timetable (Batch 1/2 Grid)
router.post('/timetable/upload', upload.single('file'), async (req, res, next) => {
    try {
        const { batch } = req.body; // "Batch 1" or "Batch 2"
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
        } else {
            await uploadUnifiedTimetable(batch, req.file);
            res.status(200).json({ message: `Unified Timetable for ${batch} uploaded successfully` });
        }
    } catch (error) {
        next(error);
    }
});

// Req: Seed Unified Timetable via JSON (no PDF needed)
// Body: { batch: string, grid: { [dayOrder: string]: string[][] } }
// Example grid: { "1": [["A"], ["A","X"], ...], "2": [...] }
router.post('/timetable/seed', async (req, res, next) => {
    try {
        const { batch, grid } = req.body;

        if (!batch || typeof batch !== 'string') {
            return res.status(400).json({ error: 'batch (string) is required' });
        }
        if (!grid || typeof grid !== 'object' || Array.isArray(grid)) {
            return res.status(400).json({ error: 'grid must be an object mapping dayOrder → string[][]' });
        }

        const timings = [
            { startTime: 480,  endTime: 530  },
            { startTime: 530,  endTime: 580  },
            { startTime: 585,  endTime: 635  },
            { startTime: 640,  endTime: 690  },
            { startTime: 695,  endTime: 745  },
            { startTime: 750,  endTime: 800  },
            { startTime: 805,  endTime: 855  },
            { startTime: 860,  endTime: 910  },
            { startTime: 910,  endTime: 960  },
            { startTime: 960,  endTime: 1010 },
            { startTime: 1010, endTime: 1050 },
            { startTime: 1050, endTime: 1090 },
        ];

        const latest = await prisma.unifiedSlot.findFirst({
            where: { batch },
            orderBy: { version: 'desc' }
        });
        const nextVersion = (latest?.version ?? 0) + 1;

        const entries: any[] = [];
        for (const [dayOrderStr, periodSlots] of Object.entries(grid)) {
            const dayOrder = parseInt(dayOrderStr);
            if (isNaN(dayOrder) || dayOrder < 1 || dayOrder > 5) {
                return res.status(400).json({ error: `Invalid dayOrder key: "${dayOrderStr}". Must be 1–5.` });
            }
            if (!Array.isArray(periodSlots)) {
                return res.status(400).json({ error: `grid["${dayOrderStr}"] must be an array of slot arrays` });
            }
            (periodSlots as string[][]).forEach((slots, idx) => {
                const time = timings[idx] || { startTime: 0, endTime: 0 };
                entries.push({
                    batch,
                    dayOrder,
                    period: idx + 1,
                    slots,
                    startTime: time.startTime,
                    endTime: time.endTime,
                    version: nextVersion,
                    isActive: true,
                });
            });
        }

        await prisma.$transaction([
            prisma.unifiedSlot.updateMany({ where: { batch, isActive: true }, data: { isActive: false } }),
            prisma.unifiedSlot.createMany({ data: entries }),
        ]);

        return res.status(200).json({
            message: `Unified timetable seeded for batch "${batch}" (version ${nextVersion}).`,
            periodsStored: entries.length,
            version: nextVersion,
        });
    } catch (error) {
        return next(error);
    }
});

// Req: Debug — inspect what's in the DB for a given batch + dayOrder
router.get('/timetable/debug', async (req, res, next) => {
    try {
        const { batch, dayOrder } = req.query;
        const where: any = { isActive: true };
        if (batch) where.batch = batch as string;
        if (dayOrder) where.dayOrder = parseInt(dayOrder as string);

        const slots = await prisma.unifiedSlot.findMany({ where, orderBy: [{ dayOrder: 'asc' }, { period: 'asc' }] });
        const batches = await prisma.unifiedSlot.groupBy({ by: ['batch'], where: { isActive: true } });

        return res.status(200).json({
            activeBatches: batches.map(b => b.batch),
            slots,
            count: slots.length,
        });
    } catch (error) {
        return next(error);
    }
});

// Req: Section Sync (Apply one PDF to all students in a section)
router.post('/section-sync', upload.single('file'), async (req, res, next) => {
    try {
        const { section } = req.body;
        if (!req.file || !section) {
            res.status(400).json({ error: 'File and Section name are required' });
        } else {
            const result = await syncSectionTimetable(section, req.file);
            res.status(200).json({ 
                message: `Section ${section} synchronized successfully.`,
                affectedStudents: result.count
            });
        }
    } catch (error) {
        next(error);
    }
});

// Req: Fetch Admin Dashboard Stats
router.get('/stats', async (_req, res, next) => {
    try {
        const totalUsers = await prisma.user.count();
        const activeTimetables = await prisma.unifiedSlot.groupBy({ by: ['batch', 'version'], where: { isActive: true } });
        
        // Map the distinct batches that have a currently active timetable
        const activeBatches = Array.from(new Set(activeTimetables.map(t => t.batch)));
        
        res.status(200).json({
            totalUsers,
            activeTimetables: activeTimetables.length,
            activeBatches,
            systemHealth: 'Operational'
        });
    } catch (error) {
        next(error);
    }
});

// Req: List All Users (Admin)
router.get('/users', async (_req, res, next) => {
    try {
        const users = await listUsers();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

// Req: Update User (Admin)
router.put('/users/:id', async (req, res, next) => {
    try {
        const result = await updateUser(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// Req: Delete User (Admin)
router.delete('/users/:id', async (req, res, next) => {
    try {
        await deleteUser(req.params.id);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
