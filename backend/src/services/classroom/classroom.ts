import prisma from '../../config/database';
import { uploadToSupabase, deleteFromSupabase } from '../../config/supabase';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

/**
 * Generate unique invite code for classroom
 */
function generateInviteCode(): string {
  return nanoid();
}

/**
 * Create a new classroom (Teacher only)
 */
export async function createClassroom(
  teacherId: string,
  name: string,
  subject: string,
  description?: string
) {
  const inviteCode = generateInviteCode();

  const classroom = await prisma.classroom.create({
    data: {
      teacherId,
      name,
      subject,
      description,
      inviteCode,
    },
  });

  return classroom;
}

/**
 * Get all classrooms for a teacher
 */
export async function getTeacherClassrooms(teacherId: string) {
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId, isActive: true },
    include: {
      _count: {
        select: {
          members: { where: { status: 'APPROVED' } },
          posts: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return classrooms;
}

/**
 * Get classroom details with members
 */
export async function getClassroomDetails(classroomId: string, userId: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      teacher: {
        include: { user: { select: { email: true } } },
      },
      members: {
        include: {
          student: {
            select: {
              id: true,
              userId: true,
              name: true,
              registrationNumber: true,
              year: true,
              section: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!classroom) {
    throw new Error('Classroom not found');
  }

  // Check if user has access
  // For teacher: check if userId matches teacher's userId
  const isTeacher = classroom.teacher.userId === userId;
  
  // For student: check if they are an approved member
  const isMember = classroom.members.some(
    (m) => m.student.userId === userId && m.status === 'APPROVED'
  );

  if (!isTeacher && !isMember) {
    throw new Error('Access denied to this classroom');
  }

  return { classroom, isTeacher };
}

/**
 * Student requests to join classroom with invite code
 */
export async function requestJoinClassroom(studentId: string, inviteCode: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { inviteCode },
  });

  if (!classroom) {
    throw new Error('Invalid invite code');
  }

  if (!classroom.isActive) {
    throw new Error('This classroom is no longer active');
  }

  // Check if already a member
  const existingMember = await prisma.classroomMember.findUnique({
    where: {
      classroomId_studentId: {
        classroomId: classroom.id,
        studentId,
      },
    },
  });

  if (existingMember) {
    if (existingMember.status === 'APPROVED') {
      throw new Error('You are already a member of this classroom');
    }
    if (existingMember.status === 'PENDING') {
      throw new Error('Your request is pending approval');
    }
    if (existingMember.status === 'REJECTED') {
      throw new Error('Your request was rejected. Please contact the teacher.');
    }
  }

  // Create join request
  const member = await prisma.classroomMember.create({
    data: {
      classroomId: classroom.id,
      studentId,
      status: 'PENDING',
    },
    include: {
      classroom: { select: { name: true, subject: true } },
    },
  });

  return member;
}

/**
 * Teacher approves/rejects student join request
 */
export async function updateMemberStatus(
  classroomId: string,
  studentId: string,
  teacherId: string,
  status: 'APPROVED' | 'REJECTED'
) {
  // Verify teacher owns the classroom
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new Error('Classroom not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: classroom.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (classroom.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  const member = await prisma.classroomMember.update({
    where: {
      classroomId_studentId: {
        classroomId,
        studentId,
      },
    },
    data: {
      status,
      approvedAt: status === 'APPROVED' ? new Date() : null,
    },
    include: {
      student: {
        select: {
          name: true,
          registrationNumber: true,
        },
      },
    },
  });

  return member;
}

/**
 * Get pending join requests for a classroom
 */
export async function getPendingRequests(classroomId: string, teacherId: string) {
  // Verify teacher owns the classroom
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new Error('Classroom not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: classroom.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (classroom.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  const requests = await prisma.classroomMember.findMany({
    where: {
      classroomId,
      status: 'PENDING',
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          year: true,
          section: true,
          department: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return requests;
}

/**
 * Create a post in classroom (Teacher only)
 */
export async function createClassroomPost(
  classroomId: string,
  teacherId: string,
  authorName: string,
  content: string,
  title?: string,
  links?: Array<{ url: string; title: string }>,
  files?: Array<{ buffer: Buffer; name: string; mimeType: string }>
) {
  // Verify teacher owns the classroom
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new Error('Classroom not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: classroom.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (classroom.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  // Upload files to Supabase
  const attachments: Array<{ url: string; name: string; type: string; size: number }> = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToSupabase(
        file.buffer,
        file.name,
        `classroom-posts/${classroomId}`,
        file.mimeType
      );
      attachments.push({
        url: result.url,
        name: file.name,
        type: result.type,
        size: result.size,
      });
    }
  }

  const post = await prisma.classroomPost.create({
    data: {
      classroomId,
      authorId: teacherId,
      authorName,
      title,
      content,
      links: links || [],
      attachments,
    },
  });

  return post;
}

/**
 * Get all posts for a classroom
 */
export async function getClassroomPosts(classroomId: string, userId: string) {
  // Verify user has access to classroom
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      teacher: {
        select: { userId: true }
      },
      members: {
        include: {
          student: {
            select: { userId: true }
          }
        }
      },
    },
  });

  if (!classroom) {
    throw new Error('Classroom not found');
  }

  const isTeacher = classroom.teacher.userId === userId;
  const isMember = classroom.members.some((m) => m.status === 'APPROVED' && m.student.userId === userId);

  if (!isTeacher && !isMember) {
    throw new Error('Access denied');
  }

  const posts = await prisma.classroomPost.findMany({
    where: { classroomId },
    orderBy: { createdAt: 'desc' },
  });

  return posts;
}

/**
 * Delete a post (Teacher only)
 */
export async function deleteClassroomPost(
  postId: string,
  teacherId: string
) {
  const post = await prisma.classroomPost.findUnique({
    where: { id: postId },
    include: { classroom: true },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: post.classroom.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (post.classroom.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  // Delete attachments from Supabase
  const attachments = post.attachments as Array<{ url: string; path?: string }>;
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      if (attachment.url) {
        // Extract path from URL
        const urlParts = attachment.url.split('/');
        const path = urlParts.slice(-3).join('/'); // Get last 3 parts (folder/timestamp-filename)
        try {
          await deleteFromSupabase(path);
        } catch (error) {
          console.error('Failed to delete attachment:', error);
        }
      }
    }
  }

  await prisma.classroomPost.delete({
    where: { id: postId },
  });

  return { success: true };
}

/**
 * Get student's classrooms
 */
export async function getStudentClassrooms(studentId: string) {
  const memberships = await prisma.classroomMember.findMany({
    where: {
      studentId,
      status: 'APPROVED',
    },
    include: {
      classroom: {
        include: {
          teacher: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
        },
      },
    },
    orderBy: { approvedAt: 'desc' },
  });

  return memberships.map((m) => m.classroom);
}

/**
 * Delete/Archive classroom (Teacher only)
 */
export async function deleteClassroom(classroomId: string, teacherId: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new Error('Classroom not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: classroom.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (classroom.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  // Soft delete - mark as inactive
  await prisma.classroom.update({
    where: { id: classroomId },
    data: { isActive: false },
  });

  return { success: true };
}
