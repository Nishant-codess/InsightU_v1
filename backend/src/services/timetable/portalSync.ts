import prisma from '../../config/database';
import { fetchPortalHTML, fetchMultiplePages } from './portalFetcher';
import { parsePortalHTML, ScraperOutput } from './scraper';
import { parseMyTimetablePage, parseAttendancePage, parseMarksPage } from './attendanceScraper';

export interface PortalSyncInput {
  userId: string;
  loginId: string;
  password: string;
}

export interface FullPortalSyncResult {
  timetableSlots: number;
  attendanceSubjects: number;
  marksSubjects: number;
  syncedAt: string;
}

// ─── Full Sync: Timetable + Attendance + Marks ────────────────────────────────

export async function syncFullPortalData(input: PortalSyncInput): Promise<FullPortalSyncResult> {
  const { userId, loginId, password } = input;

  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error('Student profile not found.');

  // Fetch all pages in one browser session
  const pages = await fetchMultiplePages(loginId, password, [
    'timetable',
    'attendance',
    'marks',
  ]);

  const timetable = parseMyTimetablePage(pages.timetable);
  const attendance = parseAttendancePage(pages.attendance);
  const marks = parseMarksPage(pages.marks);

  // Save PersonalSlots from timetable
  const slotData = timetable.map(s => {
    const slotArr = s.slot.split('+').map(x => x.trim()).filter(Boolean);
    return {
      studentId: student.id,
      slots: slotArr,
      normalizedKey: slotArr.join(','),
      subject: s.courseTitle || s.courseCode,
      room: s.roomNo || 'N/A',
      type: s.type,
    };
  });

  const syncedAt = new Date().toISOString();

  await prisma.$transaction([
    prisma.personalSlot.deleteMany({ where: { studentId: student.id } }),
    ...(slotData.length > 0 ? [prisma.personalSlot.createMany({ data: slotData })] : []),
    prisma.portalData.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        timetable: timetable as any,
        attendance: attendance as any,
        marks: marks as any,
      },
      update: {
        timetable: timetable as any,
        attendance: attendance as any,
        marks: marks as any,
        syncedAt: new Date(),
      },
    }),
  ]);

  return {
    timetableSlots: slotData.length,
    attendanceSubjects: attendance.length,
    marksSubjects: marks.length,
    syncedAt,
  };
}

// ─── Legacy: Timetable-only sync ─────────────────────────────────────────────

export async function syncTimetable(input: PortalSyncInput): Promise<ScraperOutput> {
  const { userId, loginId, password } = input;

  const html = await fetchPortalHTML(loginId, password);
  const scraperOutput = parsePortalHTML(html);

  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error('Student profile not found.');

  await prisma.$transaction([
    prisma.personalSlot.deleteMany({ where: { studentId: student.id } }),
    prisma.personalSlot.createMany({
      data: scraperOutput.slots.map(slot => ({
        studentId: student.id,
        slots: slot.slots,
        normalizedKey: slot.normalizedKey,
        subject: slot.courseTitle || slot.courseCode,
        room: slot.roomNo,
        type: slot.type,
      })),
    }),
  ]);

  return scraperOutput;
}

// ─── Legacy: Attendance sync ──────────────────────────────────────────────────

export async function syncAttendanceAndMarks(input: PortalSyncInput) {
  return syncFullPortalData(input);
}
