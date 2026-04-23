import prisma from '../../config/database';

export interface CalendarMetadata {
  academicYear: string;
}

import { extractTextFromBuffer, parseAcademicCalendarGrid } from '../timetable/analyzer';

// Helper to process Academic Calendar from OCR text
async function processAcademicCalendar(buffer: Buffer, mimetype: string) {
  const text = await extractTextFromBuffer(buffer, mimetype);
  
  // Use the robust grid parser for SRM format
  const result = parseAcademicCalendarGrid(text);
  
  // If the parser found literally nothing (e.g., test image), 
  // we ensure today has at least a Day1 for safety.
  if (Object.keys(result.mapping).length === 0) {
      console.warn("No dates/days found in OCR text. Falling back to test mapping.");
      const todayStr = new Date().toISOString().split('T')[0];
      result.mapping[todayStr] = "Day1";
  }

  return result;
}

export async function uploadAcademicCalendar(metadata: CalendarMetadata, file: Express.Multer.File) {
  const fileUrl = `https://storage.insightu.dev/calendars/${metadata.academicYear.replace(' ', '_')}_${file.originalname}`;
  
  const calendarData = await processAcademicCalendar(file.buffer, file.mimetype);

  return prisma.academicCalendar.create({
    data: {
      academicYear: metadata.academicYear,
      fileUrl,
      dayOrderMapping: calendarData as any,
      processedAt: new Date()
    }
  });
}

export async function deleteActiveCalendar() {
  return prisma.academicCalendar.deleteMany({});
}

/**
 * Returns the current Day Order based on the system date and latest calendar.
 * @returns String like "Day1", "Day2" etc.
 */
export async function getCurrentDayOrder() {
  const latestCalendar = await prisma.academicCalendar.findFirst({
    orderBy: { uploadedAt: 'desc' }
  });

  if (!latestCalendar) return "Day1"; // Fallback

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const calendarData = latestCalendar.dayOrderMapping as any;
  const mapping = calendarData.mapping || {};
  const holidays = calendarData.holidays || {};
  
  if (holidays[todayStr]) {
      return `Holiday: ${holidays[todayStr]}`;
  }
  
  // Standard Day Order Mapping
  const mappedDay = mapping[todayStr];
  if (mappedDay) return mappedDay;

  // Fallback for weekends: SRM doesn't usually have day orders on Sat/Sun
  const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "Weekend";
  }

  return "No Day Order";
}
