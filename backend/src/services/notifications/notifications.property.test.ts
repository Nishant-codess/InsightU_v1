import fc from 'fast-check';
import { 
  sendNotification, 
  getUserNotifications, 
  markAsRead, 
 
  notifyCourseStudentsAboutNote,
  NotificationType 
} from './notifications';
import prisma from '../../config/database';

jest.mock('../../config/database', () => {
  let notifications: any[] = [];
  let preferences = new Map<string, any>();
  
  return {
    __esModule: true,
    default: {
      notification: {
        create: jest.fn(async ({ data }) => {
          const notif = { id: `notif-${Date.now()}-${Math.random()}`, ...data, read: false, createdAt: new Date() };
          notifications.push(notif);
          return notif;
        }),
        findMany: jest.fn(async ({ where }) => {
          let list = notifications.filter(n => n.userId === where.userId);
          if (where.read !== undefined) {
             list = list.filter(n => n.read === where.read);
          }
          return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          let count = 0;
          notifications.forEach(n => {
            if (n.userId === where.userId) {
              if (where.id && n.id !== where.id) return;
              if (where.read !== undefined && n.read !== where.read) return;
              n.read = data.read;
              count++;
            }
          });
          return { count };
        })
      },
      notificationPreferences: {
        findUnique: jest.fn(async ({ where }) => {
          return preferences.get(where.userId) || null;
        })
      },
      teacher: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.id === 'invalid') return null;
          return { id: where.id, name: 'Dr. Test' };
        })
      },
      student: {
        findMany: jest.fn(async () => {
          return [{ userId: 'student-1' }, { userId: 'student-2' }];
        })
      },
      studentPerformance: {
        findMany: jest.fn(async () => []),
      },
      _store: { notifications, preferences },
    },
  };
});

describe('Feature: insightu-platform, Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any)._store.notifications.length = 0;
    (prisma as any)._store.preferences.clear();
  });

  it('Property 73: Notification round-trip consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(NotificationType)),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (userId, type, title, message) => {
          const sent = await sendNotification({ userId, type, title, message });
          
          if (sent) {
            const fetchedList = await getUserNotifications(userId, { read: false });
            const fetched = fetchedList.find(n => n.id === sent.id);
            
            expect(fetched).toBeDefined();
            expect(fetched?.title).toBe(title);
            expect(fetched?.message).toBe(message);
            expect(fetched?.type).toBe(type);
            expect(fetched?.read).toBe(false);
            
            // Mark as read
            await markAsRead(sent.id, userId);
            
            const unreadList = await getUserNotifications(userId, { read: false });
            expect(unreadList.find(n => n.id === sent.id)).toBeUndefined();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 30, 71, 72: Event-triggered notifications respect preferences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.boolean(), // Enable all
        fc.boolean(), // Enable specific type
        async (userId, enableInApp, typeEnabled) => {
           // Arrange preferences
           (prisma as any)._store.preferences.set(userId, {
              userId,
              enableInApp,
              notificationTypes: {
                 [NotificationType.PERFORMANCE_ALERT]: typeEnabled
              }
           });
           
           const sent = await sendNotification({
              userId,
              type: NotificationType.PERFORMANCE_ALERT,
              title: 'Alert',
              message: 'Low Score'
           });
           
           if (!enableInApp || !typeEnabled) {
              expect(sent).toBeNull();
           } else {
              expect(sent).toBeDefined();
              expect(sent?.userId).toBe(userId);
           }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 30: Note upload triggers blast notification to students', async () => {
    const teacherId = 'teacher-123';
    const subject = 'CS101';
    
    await notifyCourseStudentsAboutNote(teacherId, subject, '/url/to/note');
    
    const notifsStudent1 = await getUserNotifications('student-1', {});
    const notifsStudent2 = await getUserNotifications('student-2', {});
    
    expect(notifsStudent1.length).toBe(1);
    expect(notifsStudent1[0].type).toBe(NotificationType.NEW_LECTURE_NOTE);
    
    expect(notifsStudent2.length).toBe(1);
    expect(notifsStudent2[0].type).toBe(NotificationType.NEW_LECTURE_NOTE);
  });

});
