const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'nr0070@srmist.edu.in' }});
  
  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    { expiresIn: '1h' }
  );
  
  console.log("Fetching /api/calendar-days with token...");
  const res = await fetch('http://localhost:3000/api/calendar-days', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const days = await res.json();
  console.log(`Fetched ${days.length} days`);
  
  // Now simulate the exact logic in CalendarPage.tsx for August 4th
  const calendarDayLookup = new Map();
  days.forEach(cd => {
     const [yyyy, mm, dd] = cd.date.split('T')[0].split('-');
     const y = parseInt(yyyy, 10);
     const m = parseInt(mm, 10) - 1;
     const d = parseInt(dd, 10);
     calendarDayLookup.set(`${y}-${m}-${d}`, cd);
  });
  
  const aug4 = calendarDayLookup.get(`2026-7-4`);
  console.log("August 4th data:", aug4);
  
  if (aug4) {
    const hasDayOrder = !!aug4?.dayOrder;
    console.log("hasDayOrder:", hasDayOrder);
  } else {
    console.log("August 4th NOT FOUND in calendarDayLookup!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
