import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.update({
    where: { email: 'nr0070@srmist.edu.in' },
    data: { passwordHash: hash }
  });
  console.log("Password reset to password123");
}
main().finally(() => prisma.$disconnect());
