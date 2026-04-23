import prisma from '../../config/database';
import { 
    processDeterministicUpload, 
    getStandardSRMTimings 
} from './analyzer';
import { AppError } from '../../types/errors';
import moment from 'moment-timezone';

// ─── Day Order Engine Types ───────────────────────────────────────────────────

export interface SchedulePeriod {
  period: number;
  status: 'CLASS' | 'FREE';
  subject: string;
  room: string;
  type: string;
  time: string;
  startTime: number; // minutes from midnight
  endTime: number;   // minutes from midnight
  isOngoing: boolean;
  isNext: boolean;
}

export interface DailySchedule {
  status: 'SUCCESS' | 'FALLBACK';
  dayOrder: number;
  date: string;
  schedule: SchedulePeriod[];
}

export interface HolidayResult {
  status: 'HOLIDAY';
  message: string;
  schedule: [];
  date: string;
  dayOrder: null;
}

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if the current time (in minutes from midnight) falls within
 * [startMinutes, endMinutes).
 */
export function computeIsOngoing(startMinutes: number, endMinutes: number): boolean {
  const nowKolkata = moment().tz('Asia/Kolkata');
  const currentMins = nowKolkata.hours() * 60 + nowKolkata.minutes();
  return currentMins >= startMinutes && currentMins < endMinutes;
}

// 60s Cache for Today's Schedule
const scheduleCache = new Map<string, { data: any, expires: number }>();

function getCacheKey(userId: string, date: string) {
    return `schedule:${userId}:${date}`;
}

function clearUserCache(userId?: string) {
    if (userId) {
        for (const key of scheduleCache.keys()) {
            if (key.includes(userId)) scheduleCache.delete(key);
        }
    } else {
        scheduleCache.clear();
    }
}

/**
 * Admin: Upload Academic Calendar
 * Date -> DayOrder
 * Handles Versioning & Activation
 */
export async function uploadCalendar(file: Express.Multer.File) {
    console.log("--- CALENDAR SYNC START ---");
    const parsed = await processDeterministicUpload(file.buffer, file.mimetype, 'calendar');
    const dates = Object.keys(parsed);
    
    console.log("Parsed calendar dates count:", dates.length);
    if (dates.length === 0) {
        console.error("Critical: No calendar dates found in document.");
        throw new Error("No calendar dates found in document.");
    }

    // 1. Determine next version
    const latest = await prisma.calendarDay.findFirst({
        orderBy: { version: 'desc' }
    });
    const nextVersion = (latest?.version || 0) + 1;
    console.log("Determined version:", nextVersion);

    // 2. Prepare entries
    const entries = dates.map(dateStr => ({
        date: new Date(dateStr),
        dayOrder: parsed[dateStr].dayOrder,
        name: parsed[dateStr].name,
        version: nextVersion,
        isActive: true
    }));

    console.log("Prepared database entries:", entries.length);

    // 3. Transaction: Deactivate old and Save new
    const result = await prisma.$transaction([
        prisma.calendarDay.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        }),
        prisma.calendarDay.createMany({
            data: entries
        })
    ]);

    // 4. Post-Insertion Validation
    const count = await prisma.calendarDay.count({
        where: { version: nextVersion, isActive: true }
    });
    
    console.log(`Verification: Found ${count} active records in DB for version ${nextVersion}`);
    if (count === 0) {
        console.error("Critical: Calendar sync failed - No records inserted.");
        throw new Error("Calendar sync failed: No records inserted into database.");
    }

    console.log("--- CALENDAR SYNC SUCCESS ---");
    return result;
}

/**
 * Admin: Upload Unified Batch Timetable
 * DayOrder + Period -> SlotID[]
 */
export async function uploadUnifiedTimetable(batch: string, file: Express.Multer.File) {
    const parsed = await processDeterministicUpload(file.buffer, file.mimetype, 'unified');
    if (Object.keys(parsed).length === 0) throw new Error("Unified grid parsing returned no day orders.");

    const timings = getStandardSRMTimings();

    // 1. Determine next version for this batch
    const latest = await prisma.unifiedSlot.findFirst({
        where: { batch },
        orderBy: { version: 'desc' }
    });
    const nextVersion = (latest?.version || 0) + 1;

    // 2. Map parsed grid to DB entries
    const entries: any[] = [];
    Object.entries(parsed).forEach(([dayOrder, periodSlots]: [string, any]) => {
        periodSlots.forEach((slots: string[], index: number) => {
            const time = timings[index] || { startTime: 0, endTime: 0 };
            entries.push({
                batch,
                dayOrder: parseInt(dayOrder),
                period: index + 1,
                slots,
                startTime: time.startTime,
                endTime: time.endTime,
                version: nextVersion,
                isActive: true
            });
        });
    });

    // 3. Transaction: Deactivate old and Save new
    const result = await prisma.$transaction([
        prisma.unifiedSlot.updateMany({
            where: { batch, isActive: true },
            data: { isActive: false }
        }),
        prisma.unifiedSlot.createMany({
            data: entries
        })
    ]);

    // 4. Invalidate global schedule cache as timetable changed
    clearUserCache();
    return result;
}

/**
 * Student: Upload Personalized Timetable
 * SlotID -> Subject/Room/Type
 */
export async function uploadPersonalTimetable(userId: string, file: Express.Multer.File) {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) throw new AppError(404, "Student profile not found.");

    const parsed = await processDeterministicUpload(file.buffer, file.mimetype, 'personal');
    if (parsed.length === 0) {
       throw new AppError(400, "Could not extract any valid class mappings. Make sure you upload the 'My Attendance' grid.");
    }

    // 1. Overwrite: Delete old mapping first
    await prisma.personalSlot.deleteMany({
        where: { studentId: student.id }
    });

    // 2. Save new personalized slots
    const result = await prisma.personalSlot.createMany({
        data: parsed.map((item: any) => ({
            ...item,
            studentId: student.id
        }))
    });

    // 3. Clear cache for this specific user
    clearUserCache(userId);
    return { count: result.count, data: parsed };
}

/**
 * Safe Mode: Returns a default generic schedule if calendar sync fails
 */
export async function getFallbackSchedule(dateStr: string) {
    const timings = getStandardSRMTimings();
    const schedule = timings.map((time, i) => {
        const hStart = Math.floor(time.startTime / 60).toString().padStart(2, '0');
        const mStart = (time.startTime % 60).toString().padStart(2, '0');
        const hEnd = Math.floor(time.endTime / 60).toString().padStart(2, '0');
        const mEnd = (time.endTime % 60).toString().padStart(2, '0');

        return {
            period: i + 1,
            status: 'FREE',
            subject: 'No Sync Data',
            room: 'N/A',
            type: 'N/A',
            time: `${hStart}:${mStart} - ${hEnd}:${mEnd}`,
            startTime: time.startTime,
            endTime: time.endTime,
            isOngoing: false,
            isNext: false
        };
    });

    return {
        status: 'FALLBACK',
        message: 'Calendar not synced. Showing default timetable.',
        dayOrder: null,
        date: dateStr,
        schedule
    };
}

/**
 * Core Deterministic Engine: Date -> DO -> Period -> Slot -> Subj
 */
export async function getScheduleByDate(userId: string, dateStr?: string) {
    try {
        // 1. Get current date/time in Asia/Kolkata for "isOngoing" logic
        const nowKolkata = moment().tz("Asia/Kolkata");
        const todayStr = nowKolkata.format("YYYY-MM-DD");
        const timeStr = nowKolkata.format("HH:mm:ss");

        // Use provided dateStr or default to today
        const targetDateStr = dateStr || todayStr;
        const isTargetToday = targetDateStr === todayStr;

        // 2. Check Cache
        const cacheKey = getCacheKey(userId, targetDateStr);
        const cached = scheduleCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) {
            return {
                status: 'ERROR',
                message: 'Student profile not found. Please log out and log back in.',
                schedule: [],
                date: targetDateStr,
                dayOrder: null,
            };
        }

        // 3. Step 1: Resolve Day Order
        const calendarEntry = await prisma.calendarDay.findFirst({
            where: { 
                date: new Date(targetDateStr),
                isActive: true
            }
        });

        // SAFE MODE: If no calendar entry found, return fallback instead of crashing
        if (!calendarEntry) {
            console.warn(`Safe Mode Triggered: No calendar entry found for ${targetDateStr}`);
            const fallback = await getFallbackSchedule(targetDateStr);
            scheduleCache.set(cacheKey, { data: fallback, expires: Date.now() + 60000 });
            return fallback;
        }

        if (calendarEntry.dayOrder === null) {
            // Graceful fallback for missing names
            const dayName = calendarEntry.name || "Academic Holiday";
            const response = { 
                status: 'HOLIDAY', 
                message: dayName, 
                schedule: [],
                date: targetDateStr,
                dayOrder: null
            };
            scheduleCache.set(cacheKey, { data: response, expires: Date.now() + 60000 });
            return response;
        }

        // 4. Step 2: Resolve Unified Slots
        const unifiedSlots = await prisma.unifiedSlot.findMany({
            where: {
                batch: student.batch,
                dayOrder: calendarEntry.dayOrder,
                isActive: true
            },
            orderBy: { period: 'asc' }
        });

        if (unifiedSlots.length === 0) {
            console.warn(`[Timetable] No unified slots found for batch="${student.batch}", dayOrder=${calendarEntry.dayOrder}. Did you seed the unified timetable for this batch?`);
        }

        // 5. Step 3: Preload Personal Map (O(n))
        const personalSlots = await prisma.personalSlot.findMany({
            where: { studentId: student.id }
        });
        
        const slotMap = new Map<string, any>();
        personalSlots.forEach(ps => {
            ps.slots.forEach(s => slotMap.set(s, ps));
        });

        // 6. Step 4: Resolve Periods
        let currentMins = -1;
        if (isTargetToday) {
            const [currentH, currentM] = timeStr.split(':').map(Number);
            currentMins = currentH * 60 + currentM;
        }

        const schedule = unifiedSlots.map((uSlot, idx) => {
            // Deterministic Match: Check if any slot in uSlot matches student's mapping
            let match: any = null;
            for (const s of uSlot.slots) {
                if (slotMap.has(s)) {
                    match = slotMap.get(s);
                    break;
                }
            }

            const isOngoing = isTargetToday && currentMins >= uSlot.startTime && currentMins < uSlot.endTime;
            const isNext = isTargetToday && !isOngoing && (idx > 0 && currentMins >= (unifiedSlots[idx-1]?.endTime || 0) && currentMins < uSlot.startTime);

            // Formatting response
            const hStart = Math.floor(uSlot.startTime / 60).toString().padStart(2, '0');
            const mStart = (uSlot.startTime % 60).toString().padStart(2, '0');
            const hEnd = Math.floor(uSlot.endTime / 60).toString().padStart(2, '0');
            const mEnd = (uSlot.endTime % 60).toString().padStart(2, '0');

            return {
                period: uSlot.period,
                status: match ? 'CLASS' : 'FREE',
                subject: match ? match.subject : 'No Class',
                room: match ? match.room : 'N/A',
                type: match ? match.type : 'N/A',
                time: `${hStart}:${mStart} - ${hEnd}:${mEnd}`,
                startTime: uSlot.startTime,
                endTime: uSlot.endTime,
                isOngoing,
                isNext
            };
        });

        // 7. Refine "isNext" to be more precise if today
        if (isTargetToday) {
            const ongoingIdx = schedule.findIndex(s => s.isOngoing);
            if (ongoingIdx !== -1 && ongoingIdx + 1 < schedule.length) {
                schedule[ongoingIdx + 1].isNext = true;
            } else if (ongoingIdx === -1) {
                const nextIdx = schedule.findIndex(s => s.startTime > currentMins);
                if (nextIdx !== -1) schedule[nextIdx].isNext = true;
            }
        }

        const response = {
            status: 'SUCCESS',
            dayOrder: calendarEntry.dayOrder,
            date: targetDateStr,
            schedule
        };

        // 8. Store in Cache
        scheduleCache.set(cacheKey, { data: response, expires: Date.now() + 60000 });

        return response;
    } catch (err: any) {
        console.error("Engine Crash in getScheduleByDate:", err);
        throw new AppError(500, `Schedule Engine Failure: ${err.message}`);
    }
}

/**
 * Admin: Sync Section Timetable
 * Provides a way for admin to upload one student's PDF and apply it to an entire section.
 */
export async function syncSectionTimetable(section: string, file: Express.Multer.File) {
    const parsed = await processDeterministicUpload(file.buffer, file.mimetype, 'personal');
    if (parsed.length === 0) throw new Error("Could not extract mapping from template PDF.");

    // 1. Find all students in this section
    const students = await prisma.student.findMany({
        where: { section }
    });

    if (students.length === 0) throw new Error(`No students found in section ${section}`);

    // 2. Transactional Update: Clear and Apply to all
    const studentIds = students.map(s => s.id);
    const userIds = students.map(s => s.userId);

    await prisma.$transaction([
        prisma.personalSlot.deleteMany({
            where: { studentId: { in: studentIds } }
        }),
        prisma.personalSlot.createMany({
            data: students.flatMap(student => 
                parsed.map((item: any) => ({
                    ...item,
                    studentId: student.id
                }))
            )
        })
    ]);

    // 3. Invalidate cache for all users in section
    userIds.forEach(uid => clearUserCache(uid));

    return { 
        count: students.length, 
        mappings: parsed.length 
    };
}

// ─── getDailySchedule ─────────────────────────────────────────────────────────

/**
 * Deterministic Day Order engine.
 *
 * Given a studentId, a date, and the student's batch, this function:
 *   1. Looks up the date in CalendarDay to get the dayOrder.
 *   2. Joins the student's PersonalSlot records with UnifiedSlot for that
 *      dayOrder + batch.
 *   3. Returns an ordered list of periods with isOngoing / isNext flags.
 *
 * Returns a HolidayResult when the date is a holiday.
 */
export async function getDailySchedule(
    studentId: string,
    date: Date,
    batch: string
): Promise<DailySchedule | HolidayResult> {
    const dateStr = moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD');

    // 1. Resolve Day Order from CalendarDay
    const calendarEntry = await prisma.calendarDay.findFirst({
        where: { date: new Date(dateStr), isActive: true }
    });

    if (!calendarEntry) {
        // No calendar entry — return fallback schedule
        const fallback = await getFallbackSchedule(dateStr);
        return fallback as unknown as DailySchedule;
    }

    if (calendarEntry.dayOrder === null) {
        return {
            status: 'HOLIDAY',
            message: calendarEntry.name || 'Academic Holiday',
            schedule: [],
            date: dateStr,
            dayOrder: null,
        };
    }

    // 2. Fetch UnifiedSlots for this batch + dayOrder
    const unifiedSlots = await prisma.unifiedSlot.findMany({
        where: { batch, dayOrder: calendarEntry.dayOrder, isActive: true },
        orderBy: { period: 'asc' },
    });

    // 3. Build personal slot map
    const personalSlots = await prisma.personalSlot.findMany({
        where: { studentId }
    });
    const slotMap = new Map<string, typeof personalSlots[0]>();
    personalSlots.forEach(ps => ps.slots.forEach(s => slotMap.set(s, ps)));

    // 4. Build schedule with isOngoing / isNext
    const schedule: SchedulePeriod[] = unifiedSlots.map((uSlot, _idx) => {
        let match: typeof personalSlots[0] | null = null;
        for (const s of uSlot.slots) {
            if (slotMap.has(s)) { match = slotMap.get(s)!; break; }
        }

        const isOngoing = computeIsOngoing(uSlot.startTime, uSlot.endTime);

        const hStart = Math.floor(uSlot.startTime / 60).toString().padStart(2, '0');
        const mStart = (uSlot.startTime % 60).toString().padStart(2, '0');
        const hEnd   = Math.floor(uSlot.endTime / 60).toString().padStart(2, '0');
        const mEnd   = (uSlot.endTime % 60).toString().padStart(2, '0');

        return {
            period: uSlot.period,
            status: match ? 'CLASS' : 'FREE',
            subject: match ? match.subject : 'No Class',
            room: match ? match.room : 'N/A',
            type: match ? match.type : 'N/A',
            time: `${hStart}:${mStart} - ${hEnd}:${mEnd}`,
            startTime: uSlot.startTime,
            endTime: uSlot.endTime,
            isOngoing,
            isNext: false, // resolved below
        };
    });

    // 5. Mark the next upcoming period
    const ongoingIdx = schedule.findIndex(s => s.isOngoing);
    if (ongoingIdx !== -1 && ongoingIdx + 1 < schedule.length) {
        schedule[ongoingIdx + 1].isNext = true;
    } else if (ongoingIdx === -1) {
        const nowMins = moment().tz('Asia/Kolkata').hours() * 60 + moment().tz('Asia/Kolkata').minutes();
        const nextIdx = schedule.findIndex(s => s.startTime > nowMins);
        if (nextIdx !== -1) schedule[nextIdx].isNext = true;
    }

    return {
        status: 'SUCCESS',
        dayOrder: calendarEntry.dayOrder,
        date: dateStr,
        schedule,
    };
}
