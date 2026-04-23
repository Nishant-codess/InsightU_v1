import prisma from '../../config/database';

export type NotesSortField = 'subject' | 'topic' | 'date';
export type SortOrder = 'asc' | 'desc';

export interface NoteFilters {
  topic?: string;
  sortBy?: NotesSortField;
  sortOrder?: SortOrder;
}

function buildOrderBy(sortBy: NotesSortField = 'date', sortOrder: SortOrder = 'desc') {
  switch (sortBy) {
    case 'subject':
      return [{ subject: sortOrder }, { lectureDate: 'desc' as const }];
    case 'topic':
      return [{ topic: sortOrder }, { lectureDate: 'desc' as const }];
    case 'date':
    default:
      return [{ lectureDate: sortOrder }];
  }
}

/**
 * Property 24: Note accessibility to students.
 * Property 25: Note organization — sorted by subject, topic, or date.
 * Property 26: Note viewer data provision — includes teacher info and bookmark state.
 */
export async function getNotesBySubject(
  subject: string,
  studentId: string,
  filters: NoteFilters = {}
) {
  const { topic, sortBy = 'date', sortOrder = 'desc' } = filters;

  return prisma.lectureNote.findMany({
    where: {
      subject,
      ...(topic ? { topic } : {}),
    },
    orderBy: buildOrderBy(sortBy, sortOrder),
    include: {
      teacher: {
        select: { name: true, department: true },
      },
      bookmarks: {
        where: { studentId },
        select: { id: true },
      },
    },
  });
}

/**
 * Retrieve notes by topic, optionally filtered by subject.
 * Property 25: Sorted by subject, topic, or date per caller preference.
 */
export async function getNotesByTopic(
  topic: string,
  studentId: string,
  filters: NoteFilters = {}
) {
  const { sortBy = 'date', sortOrder = 'desc' } = filters;

  return prisma.lectureNote.findMany({
    where: { topic },
    orderBy: buildOrderBy(sortBy, sortOrder),
    include: {
      teacher: {
        select: { name: true, department: true },
      },
      bookmarks: {
        where: { studentId },
        select: { id: true },
      },
    },
  });
}

/**
 * Get all notes for a student, grouped by subject then topic.
 * Useful for the full notes library view.
 */
export async function getAllNotes(studentId: string, filters: NoteFilters = {}) {
  const { sortBy = 'subject', sortOrder = 'asc' } = filters;

  return prisma.lectureNote.findMany({
    orderBy: buildOrderBy(sortBy, sortOrder),
    include: {
      teacher: {
        select: { name: true, department: true },
      },
      bookmarks: {
        where: { studentId },
        select: { id: true },
      },
    },
  });
}
