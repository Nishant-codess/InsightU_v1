import prisma from '../../config/database';
import { NotificationType as PrismaNotificationType, Notification, NotificationPreferences } from '@prisma/client';

export { PrismaNotificationType as NotificationType };

export interface CreateNotificationInput {
  userId: string;
  type: PrismaNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  type?: PrismaNotificationType;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export async function sendNotification(data: CreateNotificationInput): Promise<Notification | null> {
  // Check preferences: 15.1, 15.2
  const prefs = await prisma.notificationPreferences.findUnique({
    where: { userId: data.userId }
  });

  if (prefs) {
    if (!prefs.enableInApp) return null;
    const typesPrefs = prefs.notificationTypes as Record<string, boolean>;
    if (typesPrefs && typesPrefs[data.type] === false) {
      return null;
    }
  }

  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      // Prisma accepts any JSON-compatible value; cast to satisfy its InputJsonValue type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (data.metadata ?? {}) as any,
    },
  });
}

export async function sendBulkNotifications(
  userIds: string[],
  data: Omit<CreateNotificationInput, 'userId'>
): Promise<(Notification | null)[]> {
  const promises = userIds.map(userId => sendNotification({ ...data, userId }));
  return Promise.all(promises);
}

export async function getUserNotifications(
  userId: string,
  filter: NotificationFilter = {}
): Promise<Notification[]> {
  const { type, read, limit = 50, offset = 0 } = filter;

  return prisma.notification.findMany({
    where: {
      userId,
      ...(read !== undefined ? { read } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: { enableInApp?: boolean; notificationTypes?: Record<string, boolean> }
): Promise<void> {
  const existing = await prisma.notificationPreferences.findUnique({ where: { userId } });

  if (existing) {
    const currentTypes = existing.notificationTypes as Record<string, boolean>;
    await prisma.notificationPreferences.update({
      where: { userId },
      data: {
        ...(prefs.enableInApp !== undefined ? { enableInApp: prefs.enableInApp } : {}),
        ...(prefs.notificationTypes !== undefined
          ? { notificationTypes: { ...currentTypes, ...prefs.notificationTypes } }
          : {}),
      },
    });
  } else {
    // Default all notification types to enabled if not provided
    const defaultTypes: Record<string, boolean> = {
      NEW_LECTURE_NOTE: true,
      QUIZ_STARTED: true,
      QUIZ_SCHEDULED: true,
      ASSIGNMENT_POSTED: true,
      PERFORMANCE_ALERT: true,
      SYSTEM_ANNOUNCEMENT: true,
    };
    await prisma.notificationPreferences.create({
      data: {
        userId,
        enableInApp: prefs.enableInApp ?? true,
        notificationTypes: prefs.notificationTypes
          ? { ...defaultTypes, ...prefs.notificationTypes }
          : defaultTypes,
      },
    });
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  return prisma.notificationPreferences.findUnique({ where: { userId } });
}

// Requirement 6.5: Notify students about a new lecture note upload.
// Targets students who have StudentPerformance records for the given subject,
// falling back to all students if no performance data exists yet for that subject.
export async function notifyCourseStudentsAboutNote(
  teacherId: string,
  subject: string,
  actionUrl: string
): Promise<void> {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return;

  // Find students who have performance data for this subject (more targeted)
  const performances = await prisma.studentPerformance.findMany({
    where: { subject },
    select: { student: { select: { userId: true } } },
    distinct: ['studentId'],
  });

  let userIds: string[];

  if (performances.length > 0) {
    userIds = performances.map(p => p.student.userId);
  } else {
    // Fallback: no performance data yet for this subject — notify all students
    // This handles the case where notes are uploaded before any assessments exist
    const students = await prisma.student.findMany({ select: { userId: true } });
    userIds = students.map(s => s.userId);
  }

  await sendBulkNotifications(userIds, {
    type: PrismaNotificationType.NEW_LECTURE_NOTE,
    title: 'New Lecture Note Uploaded',
    message: `${teacher.name} has uploaded a new note for ${subject}`,
    actionUrl,
  });
}
