import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrate() {
  console.log('--- Starting Section Mapping Migration ---');
  
  // 1. Migrate Students
  const students = await prisma.student.findMany();

  console.log(`Found ${students.length} students to check...`);

  let studentCount = 0;
  for (const student of students) {
    if (student.section && student.batch) {
      // If section is already A1, B2 etc., skip
      if (student.section.match(/[A-Z]\d/)) continue;

      const batchNumber = student.batch.match(/\d+/)?.[0] || "";
      if (batchNumber) {
        const combinedSection = `${student.section}${batchNumber}`;
        await prisma.student.update({
          where: { id: student.id },
          data: { section: combinedSection }
        });
        studentCount++;
      }
    }
  }
  console.log(`✅ Updated ${studentCount} students to new section format.`);

  // 2. Migrate Teachers (Ambiguous, but let's fix if they follow the pattern)
  const assignments = await prisma.sectionTeacher.findMany();
  let teacherCount = 0;
  for (const a of assignments) {
      if (!a.section.match(/[A-Z]\d/)) {
          // We don't have batch for teachers, so we can't safely auto-migrate 
          // unless we assume Batch 1. For now, let's NOT auto-migrate teachers 
          // to avoid breaking things, but print a warning.
          console.log(`⚠️  Manual update required for teacher ${a.teacherId} in section ${a.section}`);
      }
  }

  console.log('--- Migration Complete ---');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
