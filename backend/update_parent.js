const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find Student
  const student = await prisma.student.findFirst({
    where: { registrationNumber: 'RA2411003010008' }
  });

  if (!student) {
    console.log("Student with RA2411003010008 not found. Finding by name...");
    const studentByName = await prisma.student.findFirst({
      where: { name: 'Nishant Ranjan' }
    });
    if (studentByName) {
       await prisma.student.update({
          where: { id: studentByName.id },
          data: { registrationNumber: 'RA2411003010008' }
       });
       console.log("Updated Nishant Ranjan's RA number to RA2411003010008");
    } else {
       console.log("Could not find Nishant Ranjan.");
       return;
    }
  }

  // Update Parent
  const parent = await prisma.parent.findFirst();
  if (parent) {
     await prisma.parent.update({
        where: { id: parent.id },
        data: { name: 'Chandana Singh' }
     });
     
     const parentUser = await prisma.user.update({
        where: { id: parent.userId },
        data: { name: 'Chandana Singh' } // Just in case, though name is in Parent model
     }).catch(() => {}); // catch error if user doesn't have name
     
     console.log("Updated Parent name to Chandana Singh");
  } else {
     console.log("No parent found in DB.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
