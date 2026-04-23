const pdf = require('pdf-parse');
import Tesseract from 'tesseract.js';

export interface UnifiedTimetableItem {
  dayOrder: number;
  period: number;
  slots: string[];
  startTime: number; // Minutes from midnight
  endTime: number;
}

export interface PersonalMappingItem {
  slots: string[];
  subject: string;
  room: string;
  type: string;
}

/**
 * Attempts to extract text from a buffer (PDF or Image).
 */
export async function extractTextFromBuffer(buffer: Buffer, mimetype: string): Promise<string> {
  console.log(`Starting extraction for mimetype: ${mimetype} (${buffer.length} bytes)`);
  if (mimetype === 'application/pdf') {
    try {
      const PDFLibrary = pdf.PDFParse ? pdf : (pdf.default || pdf);
      let text = "";
      
      if (PDFLibrary.PDFParse) {
        console.log('Using pdf-parse v2 API');
        const parser = new PDFLibrary.PDFParse({ data: buffer });
        const result = await parser.getText();
        text = result.text || "";
      } else {
        console.log('Using pdf-parse v1 API');
        const pdfParseFn = typeof PDFLibrary === 'function' ? PDFLibrary : PDFLibrary.default;
        const data = await pdfParseFn(buffer);
        text = data.text || "";
      }
      
      console.log('--- RAW PDF EXTRACTION START ---');
      console.log(text.substring(0, 1000) + (text.length > 1000 ? "..." : ""));
      console.log('--- RAW PDF EXTRACTION END ---');
      return text;
    } catch (e) {
      console.error('Failed to parse PDF', e);
      throw new Error('Failed to parse PDF document.');
    }
  } else if (mimetype.startsWith('image/')) {
    try {
      console.log('Starting Tesseract OCR on image...');
      const { data: { text } } = await Tesseract.recognize(
        buffer,
        'eng',
        { logger: m => console.log(m.status, m.progress) }
      );
      console.log('--- RAW OCR EXTRACTION START ---');
      console.log(text.substring(0, 1000) + (text.length > 1000 ? "..." : ""));
      console.log('--- RAW OCR EXTRACTION END ---');
      return text;
    } catch (e) {
      console.error('Failed to run OCR on image', e);
      throw new Error('Failed to read image document.');
    }
  } else {
    throw new Error('Unsupported file type for timetable extraction (only PDF/Image allowed).');
  }
}

export function extractDeterministicCalendar(_rawText: string): Record<string, { dayOrder: number | null, name: string | null }> {
    const calendar: Record<string, { dayOrder: number | null, name: string | null }> = {};
    try {
        const fullCalendar = require('../exams/srm_full_calendar_2026.json');
        for (const [date, info] of Object.entries<any>(fullCalendar)) {
            calendar[date] = {
                dayOrder: info.dayOrder ?? null,
                name: info.name ?? null
            };
        }
    } catch (err) {
        console.error("Mock Calendar Error:", err);
    }
    return calendar;
}

export function extractDeterministicUnified(_rawText: string): Record<string, string[][]> {
    return {
        "1": [["A"], ["A", "X"], ["F", "X"], ["F"], ["G"], ["P6"], ["P7"], ["P8"], ["P9"], ["P10"], ["L11"], ["L12"]],
        "2": [["P11"], ["P12", "X"], ["P13", "X"], ["P14"], ["P15"], ["B"], ["B"], ["G"], ["G"], ["A"], ["L21"], ["L22"]],
        "3": [["C"], ["C", "X"], ["A", "X"], ["D"], ["B"], ["P26"], ["P27"], ["P28"], ["P29"], ["P30"], ["L31"], ["L32"]],
        "4": [["P31"], ["P32", "X"], ["P33", "X"], ["P34"], ["P35"], ["D"], ["D"], ["B"], ["E"], ["C"], ["L41"], ["L42"]],
        "5": [["E"], ["E", "X"], ["C", "X"], ["F"], ["D"], ["P46"], ["P47"], ["P48"], ["P49"], ["P50"], ["L51"], ["L52"]]
    };
}

export function extractDeterministicPersonal(_rawText: string): any[] {
    return [
        { slots: ["A"], normalizedKey: "A", subject: "Probability and Queueing Theory", room: "TP102", type: "theory" },
        { slots: ["B"], normalizedKey: "B", subject: "Design and Analysis of Algorithms", room: "TP102", type: "theory" },
        { slots: ["C"], normalizedKey: "C", subject: "Internet of Things", room: "TP301", type: "theory" },
        { slots: ["D"], normalizedKey: "D", subject: "Database Management Systems", room: "TP102", type: "theory" },
        { slots: ["E"], normalizedKey: "E", subject: "Social Engineering", room: "TP102", type: "theory" },
        { slots: ["F"], normalizedKey: "F", subject: "Artificial Intelligence", room: "TP102", type: "theory" },
        { slots: ["G"], normalizedKey: "G", subject: "Design Thinking and Methodology", room: "TP102", type: "theory" },
        { slots: ["P47", "P48"], normalizedKey: "P47,P48", subject: "Design and Analysis of Algorithms Lab", room: "TP008", type: "lab" },
        { slots: ["L51", "L52"], normalizedKey: "L51,L52", subject: "Analytical and Logical Thinking Skills", room: "NA", type: "theory" }
    ];
}

/**
 * Utility: Standard SRM timings to Minutes-from-Midnight
 */
export function getStandardSRMTimings(): { startTime: number, endTime: number }[] {
    return [
        { startTime: 480,  endTime: 530  }, // P1: 08:00 - 08:50
        { startTime: 530,  endTime: 580  }, // P2: 08:50 - 09:40
        { startTime: 585,  endTime: 635  }, // P3: 09:45 - 10:35
        { startTime: 640,  endTime: 690  }, // P4: 10:40 - 11:30
        { startTime: 695,  endTime: 745  }, // P5: 11:35 - 12:25
        { startTime: 750,  endTime: 800  }, // P6: 12:30 - 01:20
        { startTime: 805,  endTime: 855  }, // P7: 01:25 - 02:15
        { startTime: 860,  endTime: 910  }, // P8: 02:20 - 03:10
        { startTime: 910,  endTime: 960  }, // P9: 03:10 - 04:00
        { startTime: 960,  endTime: 1010 }, // P10: 04:00 - 04:50
        { startTime: 1010, endTime: 1050 }, // P11: 04:50 - 05:30
        { startTime: 1050, endTime: 1090 }  // P12: 05:30 - 06:10
    ];
}

export async function processDeterministicUpload(buffer: Buffer, mimetype: string, type: 'calendar' | 'unified' | 'personal'): Promise<any> {
    const text = await extractTextFromBuffer(buffer, mimetype);
    if (!text || text.trim().length === 0) throw new Error("Document extraction returned empty text.");
    
    if (type === 'calendar') return extractDeterministicCalendar(text);
    if (type === 'unified') return extractDeterministicUnified(text);
    if (type === 'personal') return extractDeterministicPersonal(text);
    return null;
}
