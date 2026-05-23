const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const days = await prisma.calendarDay.findMany({
     where: {
        date: {
           gte: new Date('2026-08-01'),
           lte: new Date('2026-08-05')
        }
     }
  });
  console.log("DB returned:");
  days.forEach(d => {
     console.log(d.date.toISOString(), "->", d.dayOrder);
  });
}
main().finally(() => prisma.$disconnect());
