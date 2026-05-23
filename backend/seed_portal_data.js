const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findUnique({
    where: { registrationNumber: 'RA2411003010008' }
  });

  if (!student) {
    console.log("Student not found");
    return;
  }

  const attendanceData = [
    { subject: "Data Structures", attended: 25, total: 30, percentage: 83.3 },
    { subject: "Computer Architecture", attended: 28, total: 30, percentage: 93.3 },
    { subject: "Object Oriented Programming", attended: 15, total: 20, percentage: 75.0 }
  ];

  const marksData = [
    { 
      subject: "Data Structures", 
      assessments: [
        { name: "Cycle Test 1", scored: 45, max: 50 },
        { name: "Surprise Test 1", scored: 10, max: 10 }
      ]
    },
    { 
      subject: "Computer Architecture", 
      assessments: [
        { name: "Cycle Test 1", scored: 38, max: 50 }
      ]
    }
  ];

  await prisma.portalData.upsert({
    where: { studentId: student.id },
    update: {
      attendance: attendanceData,
      marks: marksData
    },
    create: {
      studentId: student.id,
      attendance: attendanceData,
      marks: marksData
    }
  });

  console.log("Portal data seeded successfully for Nishant");
}

main().catch(console.error).finally(() => prisma.$disconnect());
