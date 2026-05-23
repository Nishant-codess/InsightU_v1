import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cd = await prisma.calendarDay.findMany({
    where: { date: { gte: new Date('2026-08-01') } },
    take: 5
  });
  console.log(JSON.stringify(cd, null, 2));
}
main().finally(() => prisma.$disconnect());
