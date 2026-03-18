import prisma from '../../config/database';

export async function getSectionDetails(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) throw new Error('Student not found');

  const { year, section, department } = student;

  // Fetch classmates (Req: same year, section, department)
  const classmates = await prisma.student.findMany({
    where: {
      year,
      section,
      department,
      id: { not: studentId },
    },
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      collegeMailId: true,
    },
  });

  // Fetch assigned teachers (Req: mapped via SectionTeacher)
  const assignments = await prisma.sectionTeacher.findMany({
    where: {
      year,
      section,
      department,
    },
    include: {
      teacher: true,
    },
  });

  const teachers = assignments.map((a) => ({
    id: a.teacher.id,
    name: a.teacher.name,
    subjects: a.teacher.subjects,
  }));

  return {
    cohort: { year, section, department },
    classmates,
    teachers,
  };
}

export async function getTeacherSections(teacherId: string) {
  const assignments = await prisma.sectionTeacher.findMany({
    where: { teacherId },
  });

  return assignments.map((a) => ({
    year: a.year,
    section: a.section,
    department: a.department,
  }));
}

export interface PostData {
  content: string;
  attachments?: string[];
}

export async function createSectionPost(userId: string, role: string, data: PostData) {
  let year: number, section: string, department: string, authorName: string;

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) throw new Error('Student profile not found');
    ({ year, section, department, name: authorName } = student);
  } else if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new Error('Teacher profile not found');
    authorName = teacher.name;
    // For teachers, we'll assume they post to a specific section passed in data 
    // but for now let's simplify and say they post to THEIR first assigned section if not specified
    const assignment = await prisma.sectionTeacher.findFirst({ where: { teacherId: teacher.id } });
    if (!assignment) throw new Error('Teacher not assigned to any section');
    ({ year, section, department } = assignment);
  } else {
    throw new Error('Unauthorized role for section posts');
  }

  return prisma.sectionPost.create({
    data: {
      year,
      section,
      department,
      authorId: userId,
      authorName,
      content: data.content,
      attachments: data.attachments || [],
    },
  });
}

export async function getSectionPosts(year: number, section: string, department: string) {
  return prisma.sectionPost.findMany({
    where: { year, section, department },
    orderBy: { createdAt: 'desc' },
  });
}
