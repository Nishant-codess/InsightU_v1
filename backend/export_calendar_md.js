const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const days = await prisma.calendarDay.findMany({
    orderBy: { date: 'asc' },
  });
  
  let md = "# Extracted Academic Planner Details\n\n";
  md += "Here are the exact dates, day orders, and events extracted from the Academic Planner PDFs for both the Even and Odd semesters.\n\n";
  md += "| Date | Day | Day Order | Event |\n";
  md += "|---|---|---|---|\n";
  
  for (const d of days) {
     const dateStr = d.date.toISOString().split('T')[0]; // YYYY-MM-DD
     const dayOfWeek = d.date.toLocaleDateString('en-US', { weekday: 'short' });
     const doStr = d.dayOrder ? `DO ${d.dayOrder}` : '-';
     const eventStr = d.name || '-';
     md += `| ${dateStr} | ${dayOfWeek} | ${doStr} | ${eventStr} |\n`;
  }
  
  // write artifact to the correct artifacts folder
  // I don't know the conversation ID exactly here, I'll just log it.
  fs.writeFileSync('extracted_calendar.md', md);
  console.log(md.substring(0, 500));
}

main().finally(() => prisma.$disconnect());
