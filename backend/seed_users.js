const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: { email: 'admin@insightu.edu', passwordHash, role: 'ADMIN' }
    });
    await prisma.admin.create({ data: { userId: admin.id, name: 'Admin User' } });
    console.log('Created Admin:', admin.email);
  }

  // Teacher
  let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  let teacherProfile;
  if (!teacher) {
    teacher = await prisma.user.create({
      data: { email: 'teacher@insightu.edu', passwordHash, role: 'TEACHER' }
    });
    teacherProfile = await prisma.teacher.create({
      data: { userId: teacher.id, name: 'Dr. S. Padmini', department: 'Computer Science', approvalStatus: 'APPROVED' }
    });
    console.log('Created Teacher:', teacher.email);
  } else {
    teacherProfile = await prisma.teacher.findUnique({ where: { userId: teacher.id } });
    if (!teacherProfile) {
      teacherProfile = await prisma.teacher.create({ data: { userId: teacher.id, name: 'Dr. S. Padmini', department: 'Computer Science', approvalStatus: 'APPROVED' } });
    }
  }

  // Student
  let student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  let studentProfile;
  if (!student) {
    student = await prisma.user.create({
      data: { email: 'student@insightu.edu', passwordHash, role: 'STUDENT' }
    });
    studentProfile = await prisma.student.create({
      data: { userId: student.id, name: 'Nishant Ranjan', registrationNumber: 'RA2311003010001', course: 'B.Tech', department: 'CSE', branch: 'CSE', year: 3, section: 'A', batch: 'Batch 1', group: 'G1', collegeMailId: 'student@insightu.edu' }
    });
    console.log('Created Student:', student.email);
  } else {
    studentProfile = await prisma.student.findUnique({ where: { userId: student.id } });
    if (!studentProfile) {
      studentProfile = await prisma.student.create({ data: { userId: student.id, name: 'Nishant Ranjan', registrationNumber: 'RA2311003010001', course: 'B.Tech', department: 'CSE', branch: 'CSE', year: 3, section: 'A', batch: 'Batch 1', group: 'G1', collegeMailId: 'student@insightu.edu' } });
    }
  }

  // Parent
  let parent = await prisma.user.findFirst({ where: { role: 'PARENT' } });
  let parentProfile;
  if (!parent) {
    parent = await prisma.user.create({
      data: { email: 'parent@insightu.edu', passwordHash, role: 'PARENT' }
    });
    parentProfile = await prisma.parent.create({
      data: { userId: parent.id, name: 'Parent User', childSrmEmail: student.email, childSrmPassword: 'password123', approvalStatus: 'APPROVED' }
    });
    console.log('Created Parent:', parent.email);
  } else {
    parentProfile = await prisma.parent.findUnique({ where: { userId: parent.id } });
    if (!parentProfile) {
      parentProfile = await prisma.parent.create({ data: { userId: parent.id, name: 'Parent User', childSrmEmail: student.email, childSrmPassword: 'password123', approvalStatus: 'APPROVED' } });
    }
  }

  console.log('Seed completed successfully. Use password123 for all.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
