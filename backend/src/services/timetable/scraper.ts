import * as cheerio from 'cheerio';

// ─── Error Types ─────────────────────────────────────────────────────────────

export type ScraperErrorCode = 'TABLE_1_NOT_FOUND' | 'TABLE_2_NOT_FOUND';

export class ScraperError extends Error {
  constructor(
    public readonly code: ScraperErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface StudentProfile {
  registrationNumber: string;
  name: string;
  program: string;
  department: string;
  semester: string;
  batch: string;
}

export interface PersonalSlotRow {
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  /** Raw slot identifier from the portal, e.g. "A", "P47+P48" */
  slot: string;
  roomNo: string;
  /** Derived: "lab" if slot contains "+", otherwise "theory" */
  type: 'theory' | 'lab';
  /** Normalised slot array, e.g. ["P47","P48"] */
  slots: string[];
  /** Comma-joined key for DB uniqueness, e.g. "P47,P48" */
  normalizedKey: string;
}

export interface ScraperOutput {
  profile: StudentProfile;
  slots: PersonalSlotRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Trim and collapse internal whitespace */
function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Classify a slot identifier.
 * A slot is a "lab" if it contains a "+" character (e.g. "P47+P48"),
 * otherwise it is "theory".
 */
export function classifySlotType(slot: string): 'theory' | 'lab' {
  return slot.includes('+') ? 'lab' : 'theory';
}

/**
 * Split a raw slot string into an array of individual slot codes.
 * "P47+P48" → ["P47", "P48"]
 * "A"       → ["A"]
 */
export function splitSlot(slot: string): string[] {
  return slot
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Table Parsers ────────────────────────────────────────────────────────────

/**
 * Parse the first HTML table on the page to extract the student profile.
 *
 * Expected columns (order may vary; we match by header text):
 *   Registration Number | Name | Program | Department | Semester | Batch
 */
function parseProfileTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<cheerio.Element>): StudentProfile {
  // Build a header→index map from the first <tr>
  const headerMap: Record<string, number> = {};
  table.find('tr').first().find('th, td').each((i, el) => {
    headerMap[clean($(el).text()).toLowerCase()] = i;
  });

  // Fallback: if no headers found, assume positional order
  const hasHeaders = Object.keys(headerMap).length > 0;

  // Find the first data row (skip header row)
  const rows = table.find('tr').toArray();
  const dataRow = rows.find((row) => {
    const cells = $(row).find('td');
    return cells.length >= 4; // at least 4 cells = likely a data row
  });

  if (!dataRow) {
    // Return empty profile rather than crashing — caller can decide
    return {
      registrationNumber: '',
      name: '',
      program: '',
      department: '',
      semester: '',
      batch: '',
    };
  }

  const cells = $(dataRow).find('td').toArray().map((el) => clean($(el).text()));

  const get = (keys: string[], fallbackIndex: number): string => {
    if (hasHeaders) {
      for (const key of keys) {
        const idx = headerMap[key];
        if (idx !== undefined && cells[idx]) return cells[idx];
      }
    }
    return cells[fallbackIndex] ?? '';
  };

  return {
    registrationNumber: get(['registration number', 'reg no', 'regno', 'registration no'], 0),
    name: get(['name', 'student name'], 1),
    program: get(['program', 'programme', 'course'], 2),
    department: get(['department', 'dept'], 3),
    semester: get(['semester', 'sem'], 4),
    batch: get(['batch'], 5),
  };
}

/**
 * Parse the second HTML table to extract course-slot mappings.
 *
 * Expected columns: Course Code | Course Title | Faculty Name | Slot | Room No
 */
function parseSlotTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<cheerio.Element>): PersonalSlotRow[] {
  // Build header→index map
  const headerMap: Record<string, number> = {};
  table.find('tr').first().find('th, td').each((i, el) => {
    headerMap[clean($(el).text()).toLowerCase()] = i;
  });

  const rows = table.find('tr').toArray();
  const results: PersonalSlotRow[] = [];

  for (const row of rows) {
    const cells = $(row).find('td').toArray().map((el) => clean($(el).text()));
    if (cells.length < 4) continue; // skip header / empty rows

    const get = (keys: string[], fallbackIndex: number): string => {
      for (const key of keys) {
        const idx = headerMap[key];
        if (idx !== undefined && cells[idx] !== undefined) return cells[idx];
      }
      return cells[fallbackIndex] ?? '';
    };

    const courseCode = get(['course code', 'code'], 0);
    const courseTitle = get(['course title', 'title', 'subject'], 1);
    const facultyName = get(['faculty name', 'faculty', 'teacher'], 2);
    const rawSlot = get(['slot', 'slots'], 3);
    const roomNo = get(['room no', 'room', 'venue'], 4);

    // Skip rows that look like headers or are empty
    if (!rawSlot || rawSlot.toLowerCase() === 'slot') continue;

    const type = classifySlotType(rawSlot);
    const slots = splitSlot(rawSlot);
    const normalizedKey = slots.join(',');

    results.push({
      courseCode,
      courseTitle,
      facultyName,
      slot: rawSlot,
      roomNo,
      type,
      slots,
      normalizedKey,
    });
  }

  return results;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Parse the full HTML fetched from the SRM academia portal timetable page.
 *
 * Expects at least two HTML tables:
 *   1. Student profile table
 *   2. Course-slot mapping table
 *
 * Throws `ScraperError` with the appropriate code if a required table is missing.
 */
export function parsePortalHTML(html: string): ScraperOutput {
  const $ = cheerio.load(html);
  const tables = $('table');

  if (tables.length < 1) {
    throw new ScraperError(
      'TABLE_1_NOT_FOUND',
      'Profile table not found in portal HTML. The portal structure may have changed.'
    );
  }

  if (tables.length < 2) {
    throw new ScraperError(
      'TABLE_2_NOT_FOUND',
      'Slot table not found in portal HTML. The portal structure may have changed.'
    );
  }

  const profileTable = tables.eq(0);
  const slotTable = tables.eq(1);

  const profile = parseProfileTable($, profileTable);
  const slots = parseSlotTable($, slotTable);

  return { profile, slots };
}
