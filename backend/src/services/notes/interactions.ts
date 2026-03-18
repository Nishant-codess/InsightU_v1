import prisma from '../../config/database';

export async function bookmarkNote(studentId: string, noteId: string) {
  return prisma.noteBookmark.create({
    data: {
      studentId,
      noteId,
    },
  });
}

export async function unbookmarkNote(studentId: string, noteId: string) {
  return prisma.noteBookmark.delete({
    where: {
      studentId_noteId: {
        studentId,
        noteId,
      },
    },
  });
}

export interface AnnotationData {
  content: string;
  page?: number;
  positionX?: number;
  positionY?: number;
}

export async function addAnnotation(studentId: string, noteId: string, data: AnnotationData) {
  // Property 29: Annotation isolation. Annotations are kept in NoteAnnotation separate from LectureNote
  return prisma.noteAnnotation.create({
    data: {
      studentId,
      noteId,
      content: data.content,
      page: data.page,
      positionX: data.positionX,
      positionY: data.positionY,
    },
  });
}

export async function getAnnotations(studentId: string, noteId: string) {
  return prisma.noteAnnotation.findMany({
    where: {
      studentId,
      noteId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
