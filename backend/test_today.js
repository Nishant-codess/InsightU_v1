const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cd = await prisma.calendarDay.findFirst({
     where: { date: new Date('2026-05-23T00:00:00.000Z') }
  });
  console.log("May 23 2026:", cd);
}
main().finally(() => prisma.$disconnect());
