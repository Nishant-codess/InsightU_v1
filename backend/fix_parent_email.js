const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentUser = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { student: true }
  });
  
  if (studentUser) {
     await prisma.parent.updateMany({
        data: { childSrmEmail: studentUser.email }
     });
     console.log("Updated parent childSrmEmail to", studentUser.email);
  }
}

main().finally(() => prisma.$disconnect());
