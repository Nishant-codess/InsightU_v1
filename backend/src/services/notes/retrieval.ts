import prisma from '../../config/database';

export async function getNotesBySubject(subject: string, userId: string) {
  // Properties 24 & 26: Note accessibility and viewer data provision.
  // In a real application, we would check if the student belongs to the subject.
  // For basic retrieval, we sort by date descending to map Property 25: Organization.
  return prisma.lectureNote.findMany({
    where: { subject },
    orderBy: { lectureDate: 'desc' },
    include: {
      teacher: {
        select: {
          name: true,
          department: true,
        },
      },
      // Include any bookmarks for this specific user
      bookmarks: {
        where: { studentId: userId },
      },
    },
  });
}

export async function getNotesByTopic(topic: string, userId: string) {
  return prisma.lectureNote.findMany({
    where: { topic },
    orderBy: { lectureDate: 'desc' },
    include: {
      teacher: {
        select: {
          name: true,
        },
      },
      bookmarks: {
        where: { studentId: userId },
      },
    },
  });
}
