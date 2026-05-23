const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const days = await prisma.calendarDay.findMany({
    orderBy: { date: 'asc' },
  });
  
  let md = "# Extracted Academic Planner Details\n\n";
  md += "| Date | Day | Day Order | Event |\n";
  md += "|---|---|---|---|\n";
  
  for (const d of days) {
     const dateStr = d.date.toISOString().split('T')[0]; // YYYY-MM-DD
     const dayOfWeek = d.date.toLocaleDateString('en-US', { weekday: 'short' });
     const doStr = d.dayOrder ? `DO ${d.dayOrder}` : '-';
     const eventStr = d.name || '-';
     md += `| ${dateStr} | ${dayOfWeek} | ${doStr} | ${eventStr} |\n`;
  }
  
  fs.writeFileSync('extracted_calendar.md', md);
  console.log("Done");
}

main().finally(() => prisma.$disconnect());
