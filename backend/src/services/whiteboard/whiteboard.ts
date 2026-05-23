import prisma from '../../config/database';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

/**
 * Generate unique invite code for whiteboard
 */
function generateInviteCode(): string {
  return nanoid();
}

/**
 * Create a new whiteboard (Teacher only)
 */
export async function createWhiteboard(
  teacherId: string,
  title: string,
  description?: string,
  classroomId?: string
) {
  const inviteCode = generateInviteCode();

  const whiteboard = await prisma.whiteboard.create({
    data: {
      teacherId,
      title,
      description,
      inviteCode,
      classroomId,
      content: { elements: [], appState: {} }, // Excalidraw format
    },
  });

  return whiteboard;
}

/**
 * Get all whiteboards for a teacher
 */
export async function getTeacherWhiteboards(teacherId: string) {
  const whiteboards = await prisma.whiteboard.findMany({
    where: { teacherId, isActive: true },
    include: {
      classroom: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          members: { where: { status: 'APPROVED' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return whiteboards;
}

/**
 * Get whiteboard details
 */
export async function getWhiteboardDetails(whiteboardId: string, userId: string) {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    include: {
      classroom: {
        select: {
          name: true,
        },
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
    },
  });

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  // Check if user has access
  // For teacher: need to get teacher's userId from teacherId
  const teacher = await prisma.teacher.findUnique({
    where: { id: whiteboard.teacherId },
    select: { userId: true }
  });
  
  const isTeacher = teacher?.userId === userId;
  const memberRecord = whiteboard.members.find((m) => m.student.userId === userId);
  const isMember = memberRecord?.status === 'APPROVED';

  // If student is PENDING, return basic info with isPending flag instead of throwing
  const isPendingMember = whiteboard.members.find((m) => m.student.userId === userId && m.status === 'PENDING');
  if (!isTeacher && !isMember) {
    if (isPendingMember) {
      return {
        whiteboard: {
          ...whiteboard,
          content: {},
          members: [],
        },
        isTeacher: false,
        canAnnotate: false,
        annotationRequested: false,
        isPending: true,
      };
    }
    throw new Error('Access denied to this whiteboard');
  }

  return { 
    whiteboard, 
    isTeacher,
    canAnnotate: isTeacher ? true : (memberRecord?.canAnnotate || false),
    annotationRequested: memberRecord?.annotationRequested || false,
    isPending: false,
  };
}

/**
 * Student requests to join whiteboard with invite code
 */
export async function requestJoinWhiteboard(studentId: string, inviteCode: string) {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { inviteCode },
  });

  if (!whiteboard) {
    throw new Error('Invalid invite code');
  }

  if (!whiteboard.isActive) {
    throw new Error('This whiteboard is no longer active');
  }

  // Check if already a member
  const existingMember = await prisma.whiteboardMember.findUnique({
    where: {
      whiteboardId_studentId: {
        whiteboardId: whiteboard.id,
        studentId,
      },
    },
  });

  if (existingMember) {
    if (existingMember.status === 'APPROVED') {
      throw new Error('You are already a member of this whiteboard');
    }
    if (existingMember.status === 'PENDING') {
      throw new Error('Your request is pending approval');
    }
    if (existingMember.status === 'REJECTED') {
      throw new Error('Your request was rejected. Please contact the teacher.');
    }
  }

  // Create join request
  const member = await prisma.whiteboardMember.create({
    data: {
      whiteboardId: whiteboard.id,
      studentId,
      status: 'PENDING',
    },
    include: {
      whiteboard: { select: { title: true } },
    },
  });

  return member;
}

/**
 * Teacher approves/rejects student join request
 */
export async function updateWhiteboardMemberStatus(
  whiteboardId: string,
  studentId: string,
  teacherId: string,
  status: 'APPROVED' | 'REJECTED'
) {
  // Verify teacher owns the whiteboard
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
  });

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: whiteboard.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID
  // If it matches whiteboard.teacherId, it's the teacher's record ID (correct)
  // Otherwise, we need to verify it's the userId
  let isOwner = false;
  if (whiteboard.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  const member = await prisma.whiteboardMember.update({
    where: {
      whiteboardId_studentId: {
        whiteboardId,
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
 * Get pending join requests for a whiteboard
 */
export async function getPendingWhiteboardRequests(whiteboardId: string, teacherId: string) {
  // Verify teacher owns the whiteboard
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
  });

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: whiteboard.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (whiteboard.teacherId === teacherId) {
    // teacherId is the Teacher record ID
    isOwner = true;
  } else {
    // teacherId might be userId, check if it matches teacher's userId
    isOwner = teacher?.userId === teacherId;
  }

  if (!isOwner) {
    throw new Error('Access denied');
  }

  const requests = await prisma.whiteboardMember.findMany({
    where: {
      whiteboardId,
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
 * Update whiteboard content (Teacher or approved members)
 */
export async function updateWhiteboardContent(
  whiteboardId: string,
  userId: string,
  content: any // Excalidraw elements and appState
) {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    include: {
      members: {
        include: {
          student: {
            select: { userId: true }
          }
        }
      },
    },
  });

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  // Get teacher's userId from teacherId
  const teacher = await prisma.teacher.findUnique({
    where: { id: whiteboard.teacherId },
    select: { userId: true }
  });

  const isTeacher = teacher?.userId === userId;
  const isMember = whiteboard.members.some((m) => m.status === 'APPROVED' && m.student.userId === userId);

  if (!isTeacher && !isMember) {
    throw new Error('Access denied');
  }

  const updated = await prisma.whiteboard.update({
    where: { id: whiteboardId },
    data: { content },
  });

  return updated;
}

/**
 * Get student's whiteboards
 */
export async function getStudentWhiteboards(studentId: string) {
  const memberships = await prisma.whiteboardMember.findMany({
    where: {
      studentId,
      status: 'APPROVED',
      whiteboard: { isActive: true }, // Filter out soft-deleted whiteboards
    },
    include: {
      whiteboard: {
        include: {
          classroom: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { approvedAt: 'desc' },
  });

  return memberships.map((m) => m.whiteboard);
}

/**
 * Delete/Archive whiteboard (Teacher only)
 */
export async function deleteWhiteboard(whiteboardId: string, teacherId: string) {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
  });

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  // Get teacher's userId to compare
  const teacher = await prisma.teacher.findUnique({
    where: { id: whiteboard.teacherId },
    select: { userId: true }
  });

  // Check if the provided teacherId is actually the teacher's record ID or userId
  let isOwner = false;
  if (whiteboard.teacherId === teacherId) {
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
  await prisma.whiteboard.update({
    where: { id: whiteboardId },
    data: { isActive: false },
  });

  return { success: true };
}

/**
 * Student requests annotation permission
 */
export async function requestAnnotationPermission(whiteboardId: string, studentUserId: string) {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
  });

  if (!student) {
    throw new Error('Student profile not found');
  }

  const member = await prisma.whiteboardMember.update({
    where: {
      whiteboardId_studentId: {
        whiteboardId,
        studentId: student.id,
      },
    },
    data: {
      annotationRequested: true,
    },
  });

  return member;
}

/**
 * Teacher grants/revokes annotation permission
 */
export async function updateAnnotationPermission(
  whiteboardId: string,
  studentId: string,
  teacherUserId: string,
  allowed: boolean
) {
  // Verify teacher owns the whiteboard
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
  });

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
  });

  if (!teacher || whiteboard.teacherId !== teacher.id) {
    throw new Error('Access denied');
  }

  const member = await prisma.whiteboardMember.update({
    where: {
      whiteboardId_studentId: {
        whiteboardId,
        studentId,
      },
    },
    data: {
      canAnnotate: allowed,
      annotationRequested: false, // Clear the pending request
    },
  });

  return member;
}
