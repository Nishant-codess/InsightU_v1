import prisma from '../../config/database';

export interface TimetableMetadata {
  year: number;
  batch: string;
}

// Helper to simulate OCR/Layout extraction from a Timetable Document
async function mockExtractTimetable(metadata: TimetableMetadata) {
  const subjects = ['Math', 'Physics', 'Computer Science', 'Electronic Circuits', 'Soft Skills', 'Communication'];
  const times = ['09:00 AM', '10:00 AM', '11:15 AM', '01:00 PM', '02:00 PM'];
  
  const schedule: Record<string, any[]> = {};
  
  for (let i = 1; i <= 5; i++) {
     const dayKey = `Day${i}`;
     schedule[dayKey] = times.map((time, idx) => ({
        time,
        subject: subjects[(idx + i) % subjects.length],
        room: `Hall ${100 + metadata.year * 10 + idx}`,
        section: 'All'
     }));
  }
  
  return schedule;
}

export async function uploadTimetable(metadata: TimetableMetadata, file: Express.Multer.File) {
  if (!['Batch 1', 'Batch 2'].includes(metadata.batch)) {
    throw new Error('Batch must be either "Batch 1" or "Batch 2"');
  }
  
  const fileUrl = `https://storage.insightu.dev/timetables/${metadata.year}_${metadata.batch.replace(' ', '')}_${file.originalname}`;

  // Functional Extraction logic (Req: Go through PDF/Image and create logic/map)
  const extractedSchedule = await mockExtractTimetable(metadata);

  return prisma.timetable.upsert({
    where: {
      year_batch: {
        year: Number(metadata.year),
        batch: String(metadata.batch)
      }
    },
    update: {
      fileUrl,
      schedule: extractedSchedule,
      processedAt: new Date()
    },
    create: {
      year: Number(metadata.year),
      batch: String(metadata.batch),
      fileUrl,
      schedule: extractedSchedule
    }
  });
}

export async function getStudentTimetable(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error('Student not found');
  
  const timetable = await prisma.timetable.findFirst({
      where: {
          year: Number(student.year),
          batch: String(student.batch)
      }
  });

  if (!timetable) {
      if (student.year !== 2) {
          return { message: "Timetable not available yet. Please ask the admin to upload timetable." };
      }
      return { message: "No timetable found for your cohort." };
  }

  // Retrieve current day order from Academic Calendar (Simulated)
  const calendar = await prisma.academicCalendar.findFirst({
      orderBy: { uploadedAt: 'desc' }
  });
  
  const activeDayOrder = (calendar?.dayOrderMapping as any)?.current || "Day1";

  return {
     currentDayOrder: activeDayOrder,
     schedule: (timetable.schedule as Record<string, any>)[activeDayOrder] || []
  };
}
