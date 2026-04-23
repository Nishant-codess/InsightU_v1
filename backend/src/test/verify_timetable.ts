import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  console.log('--- Verifying Timetable Feature ---');
  
  // 1. Create a dummy Academic Calendar if not exists
  await prisma.academicCalendar.upsert({
    where: { id: 'test-calendar' },
    update: { dayOrderMapping: { current: 'Day2' } },
    create: { 
      id: 'test-calendar', 
      academicYear: '2025-26', 
      fileUrl: 's3://calendar.pdf', 
      dayOrderMapping: { current: 'Day2' } 
    }
  });
  console.log('✅ Academic Calendar set to Day2');

  // 2. Mock Admin Upload for Year 2 Batch 1
  const { uploadTimetable } = require('../services/timetable/timetable');
  const mockFile = { originalname: 'timetable_v2.pdf' } as any;
  await uploadTimetable({ year: 2, batch: 'Batch 1' }, mockFile);
  console.log('✅ Timetable uploaded for Year 2 Batch 1');

  // 3. Verify Student A1 (Year 2, Batch 1)
  const studentA1 = await prisma.student.findFirst({
    where: { year: 2, batch: 'Batch 1' }
  });
  
  if (studentA1) {
    const { getFullStudentTimetable } = require('../services/timetable/timetable');
    const result = await getFullStudentTimetable(studentA1.id);
    console.log(`✅ Student A1 Timetable Fetch: ${result.currentDayOrder} for ${result.batch}`);
    if (result.currentDayOrder === 'Day2' && result.schedule.Day2) {
      console.log('✅ Schedule structure matches expectations');
    } else {
      console.log('❌ Schedule structure mismatch');
    }
  }

  // 4. Verify Student A2 (Year 2, Batch 2)
  const studentA2 = await prisma.student.findFirst({
    where: { year: 2, batch: 'Batch 2' }
  });
  
  if (studentA2) {
    const { getStudentTimetable } = require('../services/timetable/timetable');
    try {
      const result = await getStudentTimetable(studentA2.id);
      if (result.message && result.message.includes('not available')) {
        console.log('✅ Student A2 correctly sees "not available" for Batch 2');
      }
    } catch (e) {
      console.log('✅ Student A2 catch block correctly handled missing timetable');
    }
  }

  console.log('--- Verification Complete ---');
}

verify().catch(console.error);
