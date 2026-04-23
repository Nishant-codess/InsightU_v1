import prisma from '../../config/database';
import { Server } from 'socket.io';

let sectionIO: Server | null = null;

export function setSectionIO(io: Server) {
  sectionIO = io;
}

export async function getSectionDetails(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) throw new Error('Student not found');

  const { year, section, department } = student;

  // Fetch classmates (Req: same year, section, department)
  // Since 'section' now includes the batch (e.g. A1, A2), 
  // this automatically separates students by batch-specific section.
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

// Admin Functions
export async function updateStudentSection(studentId: string, section: string, batch: string) {
    const batchNumber = batch.match(/\d+/)?.[0] || "";
    const combinedSection = `${section}${batchNumber}`;
    
    return prisma.student.update({
        where: { id: studentId },
        data: { section: combinedSection, batch }
    });
}

export async function assignTeacherToSection(teacherId: string, year: number, section: string, department: string, batch?: string) {
    let finalSection = section;
    if (batch) {
        const batchNumber = batch.match(/\d+/)?.[0] || "";
        finalSection = `${section}${batchNumber}`;
    }

    return prisma.sectionTeacher.upsert({
        where: {
            teacherId_year_section_department: {
                teacherId,
                year,
                section: finalSection,
                department
            }
        },
        update: {}, // No change if already exists
        create: {
            teacherId,
            year,
            section: finalSection,
            department
        }
    });
}

// ─── Section Feed (Task 16) ───────────────────────────────────────────────────

/**
 * Parse sectionKey "{year}-{section}-{department}" into its parts.
 */
function parseSectionKey(sectionKey: string): { year: number; section: string; department: string } {
  const parts = sectionKey.split('-');
  if (parts.length < 3) throw new Error('Invalid sectionKey format');
  const year = parseInt(parts[0], 10);
  const section = parts[1];
  const department = parts.slice(2).join('-');
  return { year, section, department };
}

/**
 * Assert that userId is a member of the given section (student or assigned teacher).
 */
export async function assertMembership(userId: string, sectionKey: string): Promise<void> {
  const { year, section, department } = parseSectionKey(sectionKey);

  // Check if student
  const student = await prisma.student.findFirst({
    where: { userId, year, section, department },
  });
  if (student) return;

  // Check if teacher assigned to this section
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (teacher) {
    const assignment = await prisma.sectionTeacher.findFirst({
      where: { teacherId: teacher.id, year, section, department },
    });
    if (assignment) return;
  }

  throw new Error('Access denied: not a member of this section');
}

/**
 * Create a new section post.
 */
export async function createPost(
  authorId: string,
  sectionKey: string,
  content: string,
  attachments: string[] = []
) {
  const { year, section, department } = parseSectionKey(sectionKey);

  // Resolve author name
  let authorName = 'Unknown';
  const student = await prisma.student.findFirst({ where: { userId: authorId } });
  if (student) {
    authorName = student.name;
  } else {
    const teacher = await prisma.teacher.findUnique({ where: { userId: authorId } });
    if (teacher) authorName = teacher.name;
  }

  const post = await prisma.sectionPost.create({
    data: {
      year,
      section,
      department,
      sectionKey,
      authorId,
      authorName,
      content,
      attachments,
    },
    include: { comments: true },
  });

  // Emit real-time event
  if (sectionIO) {
    sectionIO.to(`section:${sectionKey}`).emit('NEW_SECTION_POST', post);
  }

  return post;
}

/**
 * Get posts for a section with cursor-based pagination (20 per page).
 */
export async function getPosts(sectionKey: string, cursor?: string) {
  return prisma.sectionPost.findMany({
    where: { sectionKey },
    orderBy: { createdAt: 'desc' },
    take: 20,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });
}

/**
 * Add a comment to a post.
 */
export async function addComment(postId: string, authorId: string, content: string) {
  // Resolve author name
  let authorName = 'Unknown';
  const student = await prisma.student.findFirst({ where: { userId: authorId } });
  if (student) {
    authorName = student.name;
  } else {
    const teacher = await prisma.teacher.findUnique({ where: { userId: authorId } });
    if (teacher) authorName = teacher.name;
  }

  return prisma.sectionComment.create({
    data: { postId, authorId, authorName, content },
  });
}

/**
 * Get all comments for a post.
 */
export async function getPostComments(postId: string) {
  return prisma.sectionComment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
  });
}
