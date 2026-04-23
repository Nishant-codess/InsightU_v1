import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getStudentDashboard, calculateAcademicHealthScore, identifyWeakSubjects, identifyWeakTopics, getPerformanceTrends, getStudyRecommendations } from '../services/analytics/performance';
import { 
    uploadPersonalTimetable, 
    getScheduleByDate 
} from '../services/timetable/timetable';
import { syncFullPortalData, syncTimetable, syncAttendanceAndMarks } from '../services/timetable/portalSync';
import { getNotesBySubject, getNotesByTopic, getAllNotes, NotesSortField, SortOrder } from '../services/notes/retrieval';
import { bookmarkNote, unbookmarkNote, addAnnotation, getAnnotations } from '../services/notes/interactions';
import { countWorkingDays, computeRiskScore } from '../services/holiday/vacationPredictor';
import multer from 'multer';
import prisma from '../config/database';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Req: Student Dashboard Analytics
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const analytics = await getStudentDashboard(student.id);
        return res.status(200).json({ analytics });
    } catch (error) {
        next(error);
        return;
    }
});

// Req 15.1 — Combined analytics endpoint
router.get('/analytics', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const [healthScore, weakSubjects, weakTopics, trends, recommendations] = await Promise.all([
            calculateAcademicHealthScore(student.id),
            identifyWeakSubjects(student.id),
            identifyWeakTopics(student.id),
            getPerformanceTrends(student.id),
            getStudyRecommendations(student.id),
        ]);

        return res.status(200).json({ healthScore, weakSubjects, weakTopics, trends, recommendations });
    } catch (error) {
        next(error);
        return;
    }
});

// Req: Upload Personalized Timetable (My Attendance PDF)
router.post('/timetable/upload-personal', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await uploadPersonalTimetable(userId, req.file);
        res.status(200).json({ 
            message: `Successfully synced ${result.count} classes.`,
            extracted: result.data
        });
    } catch (error) {
        return next(error);
    }
});

// Req: Manual timetable entry — student types in their subjects/slots directly
// Body: { slots: [{ slots: string[], normalizedKey: string, subject: string, room: string, type: string }] }
router.post('/timetable/manual', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { slots } = req.body;
        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ error: 'slots array is required and must not be empty' });
        }

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student profile not found' });

        // Validate each slot entry
        for (const s of slots) {
            if (!Array.isArray(s.slots) || s.slots.length === 0) return res.status(400).json({ error: 'Each entry must have a non-empty slots array' });
            if (!s.subject?.trim()) return res.status(400).json({ error: 'Each entry must have a subject' });
            if (!s.normalizedKey?.trim()) return res.status(400).json({ error: 'Each entry must have a normalizedKey' });
        }

        // Overwrite existing personal slots
        await prisma.$transaction([
            prisma.personalSlot.deleteMany({ where: { studentId: student.id } }),
            prisma.personalSlot.createMany({
                data: slots.map((s: any) => ({
                    studentId: student.id,
                    slots: s.slots.map((x: string) => x.trim().toUpperCase()),
                    normalizedKey: s.normalizedKey.trim().toUpperCase(),
                    subject: s.subject.trim(),
                    room: s.room?.trim() || 'N/A',
                    type: s.type || 'theory',
                })),
            }),
        ]);

        return res.status(200).json({
            message: `Timetable saved. ${slots.length} subject(s) stored permanently.`,
            count: slots.length,
        });
    } catch (error) {
        return next(error);
    }
});

// Req: Check if student has any personal slots (for import banner)
router.get('/timetable/has-slots', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(200).json({ hasSlots: false });

        const count = await prisma.personalSlot.count({ where: { studentId: student.id } });
        return res.status(200).json({ hasSlots: count > 0 });
    } catch (error) {
        return next(error);
    }
});

// Req: Deterministic Schedule (Date -> DayOrder -> Period -> Slot)
router.get('/schedule', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        const date = req.query.date as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const schedule = await getScheduleByDate(userId, date);
        return res.status(200).json(schedule);
    } catch (error: any) {
        // Expose internally caught engine failures explicitly to the frontend via 200 payload
        // Also log the actual error for debugging
        console.error("Schedule Route Error:", error);
        return res.status(200).json({ 
            status: 'ERROR', 
            message: `Schedule Engine Failure: ${error.message}`,
            stack: error.stack
        });
    }
});

// Req: Fetch Holidays (From new deterministic Calendar table)
router.get('/holidays', authenticate, async (_req: AuthRequest, res: Response, next) => {
    try {
        const holidays = await prisma.calendarDay.findMany({
            where: { dayOrder: null, isActive: true },
            orderBy: { date: 'asc' }
        });
        res.status(200).json({ holidays });
    } catch (error) {
        next(error);
    }
});

// Req 5.4, 5.5 — Notes retrieval: by subject, by topic, or all notes
// Query params: sortBy (subject|topic|date), sortOrder (asc|desc), topic (filter, subject route only)
router.get('/notes', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const sortBy = (req.query.sortBy as NotesSortField) || 'subject';
        const sortOrder = (req.query.sortOrder as SortOrder) || 'asc';

        const notes = await getAllNotes(student.id, { sortBy, sortOrder });
        return res.status(200).json({ notes });
    } catch (error) {
        next(error);
        return;
    }
});

router.get('/notes/subject/:subject', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { subject } = req.params;
        const sortBy = (req.query.sortBy as NotesSortField) || 'date';
        const sortOrder = (req.query.sortOrder as SortOrder) || 'desc';
        const topic = req.query.topic as string | undefined;

        const notes = await getNotesBySubject(subject, student.id, { sortBy, sortOrder, topic });
        return res.status(200).json({ notes });
    } catch (error) {
        next(error);
        return;
    }
});

router.get('/notes/topic/:topic', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { topic } = req.params;
        const sortBy = (req.query.sortBy as NotesSortField) || 'date';
        const sortOrder = (req.query.sortOrder as SortOrder) || 'desc';

        const notes = await getNotesByTopic(topic, student.id, { sortBy, sortOrder });
        return res.status(200).json({ notes });
    } catch (error) {
        next(error);
        return;
    }
});

// Req 6.3 — Get all bookmarked notes for the student (must come before /notes/:noteId)
router.get('/notes/bookmarks', authenticate, async (req: AuthRequest, res: Response, next) => {    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const bookmarks = await prisma.noteBookmark.findMany({
            where: { studentId: student.id },
            include: { note: true },
        });
        return res.status(200).json({ bookmarks });
    } catch (error) {
        next(error);
        return;
    }
});

// Req 26.4 — Get a single note by ID
router.get('/notes/:noteId', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { noteId } = req.params;
        const note = await prisma.lectureNote.findUnique({
            where: { id: noteId },
            include: {
                teacher: { select: { name: true, department: true } },
                bookmarks: { where: { studentId: student.id }, select: { id: true } },
            },
        });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        return res.status(200).json({ note });
    } catch (error) {
        next(error);
        return;
    }
});

// Req 6.3 — Bookmark a note
router.post('/notes/:noteId/bookmark', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { noteId } = req.params;
        try {
            const bookmark = await bookmarkNote(student.id, noteId);
            return res.status(201).json({ bookmark });
        } catch (err: any) {
            // Unique constraint violation — already bookmarked
            if (err?.code === 'P2002') {
                return res.status(200).json({ message: 'Already bookmarked' });
            }
            throw err;
        }
    } catch (error) {
        next(error);
        return;
    }
});

// Req 6.3 — Unbookmark a note
router.delete('/notes/:noteId/bookmark', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { noteId } = req.params;
        try {
            await unbookmarkNote(student.id, noteId);
            return res.status(200).json({ message: 'Bookmark removed' });
        } catch (err: any) {
            // Record not found — not bookmarked
            if (err?.code === 'P2025') {
                return res.status(200).json({ message: 'Not bookmarked' });
            }
            throw err;
        }
    } catch (error) {
        next(error);
        return;
    }
});

// Req 6.4 — Add annotation to a note (stored in NoteAnnotation, never touches LectureNote)
router.post('/notes/:noteId/annotations', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { noteId } = req.params;
        const { content, page, positionX, positionY } = req.body;

        if (!content) return res.status(400).json({ error: 'content is required' });

        const annotation = await addAnnotation(student.id, noteId, { content, page, positionX, positionY });
        return res.status(201).json({ annotation });
    } catch (error) {
        next(error);
        return;
    }
});

// Req 6.4 — Get annotations for a note
router.get('/notes/:noteId/annotations', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const { noteId } = req.params;
        const annotations = await getAnnotations(student.id, noteId);
        return res.status(200).json({ annotations });
    } catch (error) {
        next(error);
        return;
    }
});

// ─── Portal Sync Routes ───────────────────────────────────────────────────────
// IMPORTANT: Request body is NEVER logged for these routes (credentials must
// not appear in any log file).  Winston / morgan logging is intentionally

// Req: Full portal sync — timetable + attendance + marks in one shot
router.post('/portal/sync-all', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { loginId, password } = req.body;
        if (!loginId || !password) return res.status(400).json({ error: 'loginId and password are required' });

        const result = await syncFullPortalData({ userId, loginId, password });
        return res.status(200).json({
            message: `Synced. ${result.timetableSlots} slots, ${result.attendanceSubjects} attendance, ${result.marksSubjects} marks.`,
            ...result,
        });
    } catch (error: any) {
        if (error.name === 'PortalAuthError') return res.status(401).json({ error: error.message, code: error.code });
        return next(error);
    }
});

// Req: Get stored portal data (attendance + marks)
router.get('/portal/data', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const data = await prisma.portalData.findUnique({ where: { studentId: student.id } });
        if (!data) return res.status(200).json({ synced: false, attendance: [], marks: [], timetable: [] });
        return res.status(200).json({ synced: true, syncedAt: data.syncedAt, attendance: data.attendance, marks: data.marks, timetable: data.timetable });
    } catch (error) { return next(error); }
});
// excluded from these handlers.

// Req 20.1, 20.5 — One-time timetable import via SRM portal scraper
router.post('/timetable/sync', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { loginId, password } = req.body;
        if (!loginId || !password) {
            return res.status(400).json({ error: 'loginId and password are required' });
        }

        const result = await syncTimetable({ userId, loginId, password });
        // Credentials are already discarded inside syncTimetable at this point
        return res.status(200).json({
            message: `Timetable imported successfully. ${result.slots.length} slot(s) stored.`,
            slotCount: result.slots.length,
            profile: result.profile,
        });
    } catch (error: any) {
        if (error.name === 'PortalAuthError') {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return next(error);
    }
});

// Req 20.6, 20.7 — On-demand attendance + marks refresh via SRM portal scraper
router.post('/portal/sync', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { loginId, password } = req.body;
        if (!loginId || !password) {
            return res.status(400).json({ error: 'loginId and password are required' });
        }

        const result = await syncAttendanceAndMarks({ userId, loginId, password });
        // Credentials are already discarded inside syncAttendanceAndMarks at this point
        return res.status(200).json({
            message: 'Attendance and marks refreshed successfully.',
            syncedAt: result.syncedAt,
        });
    } catch (error: any) {
        if (error.name === 'PortalAuthError') {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return next(error);
    }
});

// Req 23.1, 23.2, 23.3, 23.6 — Vacation predictor: compute risk score for a planned vacation
router.post('/holiday-planner/risk', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const { startDate, endDate, currentAttendance } = req.body as {
            startDate: string;
            endDate: string;
            currentAttendance: { attended: number; total: number };
        };

        if (!startDate || !endDate || !currentAttendance) {
            return res.status(400).json({ error: 'startDate, endDate, and currentAttendance are required' });
        }

        const { attended, total } = currentAttendance;
        if (typeof attended !== 'number' || typeof total !== 'number' || total < 0 || attended < 0) {
            return res.status(400).json({ error: 'currentAttendance must have non-negative numeric attended and total fields' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid startDate or endDate' });
        }

        if (start > end) {
            return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
        }

        // Fetch CalendarDay records for the date range
        const calendarDays = await prisma.calendarDay.findMany({
            where: {
                date: { gte: start, lte: end },
                isActive: true,
            },
        });

        const workingDaysMissed = countWorkingDays(start, end, calendarDays);

        // Req 23.6: zero working days → no impact
        if (workingDaysMissed === 0) {
            return res.status(200).json({
                workingDaysMissed: 0,
                projectedAttendance: total > 0 ? (attended / total) * 100 : 100,
                riskScore: 0,
                noImpact: true,
            });
        }

        // Req 23.2: projected attendance after vacation
        const projectedAttendance = total + workingDaysMissed > 0
            ? (attended / (total + workingDaysMissed)) * 100
            : 100;

        // Req 23.3: risk score 0–10
        const riskScore = computeRiskScore(projectedAttendance);

        return res.status(200).json({
            workingDaysMissed,
            projectedAttendance: Math.round(projectedAttendance * 100) / 100,
            riskScore,
            noImpact: false,
        });
    } catch (error) {
        next(error);
        return;
    }
});

export default router;
