import * as cheerio from 'cheerio';

export interface AttendanceRecord {
  subject: string;
  courseCode: string;
  attended: number;
  total: number;
  percentage: number;
}

export interface MarksRecord {
  subject: string;
  courseCode: string;
  assessments: { name: string; scored: number; max: number; percentage: number }[];
  overall: number;
}

export interface TimetableSlot {
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  slot: string;
  roomNo: string;
  type: 'theory' | 'lab';
}

export interface PortalScrapeResult {
  timetable: TimetableSlot[];
  attendance: AttendanceRecord[];
  marks: MarksRecord[];
}

/** Parse the My Time Table page HTML */
export function parseMyTimetablePage(html: string): TimetableSlot[] {
  const $ = cheerio.load(html);
  const slots: TimetableSlot[] = [];

  // Find the course table (has columns: S.No, Course Code, Course Title, ...)
  $('table').each((_, table) => {
    const headers = $(table).find('tr').first().find('th, td').map((_, el) => $(el).text().trim().toLowerCase()).get();
    const hasSlot = headers.some(h => h.includes('slot'));
    if (!hasSlot) return;

    $(table).find('tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
      if (cells.length < 8) return;

      // Columns: S.No | Course Code | Course Title | Credit | Regn Type | Category | Course Type | Faculty | Slot | Room | AY
      const courseCode = cells[1] || '';
      const courseTitle = cells[2] || '';
      const facultyName = cells[7] || '';
      const rawSlot = cells[8] || '';
      const roomNo = cells[9] || '';

      if (!rawSlot || rawSlot.toLowerCase() === 'slot' || !courseCode) return;

      // Handle multi-slot like "P47-\nP48-"
      const cleanSlot = rawSlot.replace(/[-\n\r]/g, '+').replace(/\++/g, '+').replace(/\+$/, '').trim();
      const type = cleanSlot.includes('+') ? 'lab' : 'theory';

      slots.push({ courseCode, courseTitle, facultyName, slot: cleanSlot, roomNo, type });
    });
  });

  return slots;
}

/** Parse attendance page HTML — tries multiple table formats */
export function parseAttendancePage(html: string): AttendanceRecord[] {
  const $ = cheerio.load(html);
  const records: AttendanceRecord[] = [];

  $('table').each((_, table) => {
    const headers = $(table).find('tr').first().find('th, td')
      .map((_, el) => $(el).text().trim().toLowerCase()).get();

    const hasAttendance = headers.some(h => h.includes('attend') || h.includes('present'));
    if (!hasAttendance) return;

    $(table).find('tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
      if (cells.length < 4) return;

      // Try to find percentage column
      const pctIdx = headers.findIndex(h => h.includes('%') || h.includes('percent'));
      const attendIdx = headers.findIndex(h => h.includes('attend') || h.includes('present'));
      const totalIdx = headers.findIndex(h => h.includes('total') || h.includes('conduct'));
      const subjectIdx = headers.findIndex(h => h.includes('subject') || h.includes('course'));

      const subject = cells[subjectIdx >= 0 ? subjectIdx : 1] || '';
      const courseCode = cells[0] || '';
      const attended = parseFloat(cells[attendIdx >= 0 ? attendIdx : 3]) || 0;
      const total = parseFloat(cells[totalIdx >= 0 ? totalIdx : 4]) || 0;
      const percentage = pctIdx >= 0 ? parseFloat(cells[pctIdx]) : (total > 0 ? (attended / total) * 100 : 0);

      if (!subject || total === 0) return;
      records.push({ subject, courseCode, attended, total, percentage: Math.round(percentage * 10) / 10 });
    });
  });

  return records;
}

/** Parse marks/GPA page HTML */
export function parseMarksPage(html: string): MarksRecord[] {
  const $ = cheerio.load(html);
  const records: MarksRecord[] = [];

  $('table').each((_, table) => {
    const headers = $(table).find('tr').first().find('th, td')
      .map((_, el) => $(el).text().trim().toLowerCase()).get();

    const hasMarks = headers.some(h => h.includes('mark') || h.includes('score') || h.includes('grade'));
    if (!hasMarks) return;

    let currentSubject = '';
    let currentCode = '';
    const assessments: { name: string; scored: number; max: number; percentage: number }[] = [];

    $(table).find('tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
      if (cells.length < 3) return;

      // Detect subject row vs marks row
      const firstCell = cells[0];
      if (firstCell && /^[A-Z0-9]{6,}/.test(firstCell)) {
        // New subject
        if (currentSubject && assessments.length > 0) {
          const overall = assessments.reduce((s, a) => s + a.percentage, 0) / assessments.length;
          records.push({ subject: currentSubject, courseCode: currentCode, assessments: [...assessments], overall: Math.round(overall * 10) / 10 });
          assessments.length = 0;
        }
        currentCode = firstCell;
        currentSubject = cells[1] || firstCell;
      } else if (currentSubject) {
        const scored = parseFloat(cells[cells.length - 2]) || 0;
        const max = parseFloat(cells[cells.length - 1]) || 0;
        if (max > 0) {
          assessments.push({ name: firstCell || `Test ${assessments.length + 1}`, scored, max, percentage: Math.round((scored / max) * 1000) / 10 });
        }
      }
    });

    if (currentSubject && assessments.length > 0) {
      const overall = assessments.reduce((s, a) => s + a.percentage, 0) / assessments.length;
      records.push({ subject: currentSubject, courseCode: currentCode, assessments: [...assessments], overall: Math.round(overall * 10) / 10 });
    }
  });

  return records;
}
