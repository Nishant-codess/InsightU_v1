import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  console.log('--- Verifying Academic Calendar Sync ---');
  
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`System Date: ${todayStr}`);

  // 1. Upload a calendar via service
  const { uploadAcademicCalendar } = require('../services/calendar/calendar');
  const mockFile = { originalname: 'academic_cal_2026.pdf' } as any;
  await uploadAcademicCalendar({ academicYear: '2025-26' }, mockFile);
  console.log('✅ Academic Calendar uploaded');

  // 2. Check current day order
  const { getCurrentDayOrder } = require('../services/calendar/calendar');
  const dayOrder = await getCurrentDayOrder();
  console.log(`✅ Current Day Order determined as: ${dayOrder}`);

  // 3. Verify in Timetable Response
  const student = await prisma.student.findFirst();
  if (student) {
    const { getFullStudentTimetable } = require('../services/timetable/timetable');
    const result = await getFullStudentTimetable(student.id);
    console.log(`✅ Timetable Service matches: ${result.currentDayOrder}`);
    
    if (result.currentDayOrder === dayOrder) {
      console.log('✅ Sync successful!');
    } else {
      console.log('❌ Sync mismatch');
    }
  }

  console.log('--- Verification Complete ---');
}

verify().catch(console.error);
