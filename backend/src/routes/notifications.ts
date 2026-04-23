import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { NotificationType } from '@prisma/client';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notifications/notifications';

const router = Router();

// GET /api/notifications — get user's notifications with optional filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const read = req.query.read !== undefined ? req.query.read === 'true' : undefined;
    const type = req.query.type as NotificationType | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const notifications = await getUserNotifications(userId, { read, type, limit, offset });
    return res.status(200).json({ notifications });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/notifications/unread-count — get count of unread notifications
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const count = await getUnreadCount(userId);
    return res.status(200).json({ count });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/notifications/preferences — get notification preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const preferences = await getNotificationPreferences(userId);
    return res.status(200).json({ preferences });
  } catch (error) {
    next(error);
    return;
  }
});

// PUT /api/notifications/preferences — update notification preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { enableInApp, notificationTypes } = req.body as {
      enableInApp?: boolean;
      notificationTypes?: Record<string, boolean>;
    };

    await updateNotificationPreferences(userId, { enableInApp, notificationTypes });
    const preferences = await getNotificationPreferences(userId);
    return res.status(200).json({ preferences });
  } catch (error) {
    next(error);
    return;
  }
});

// PATCH /api/notifications/read-all — mark all notifications as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await markAllAsRead(userId);
    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
    return;
  }
});

// PATCH /api/notifications/:id/read — mark single notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    await markAsRead(id, userId);
    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
    return;
  }
});

// DELETE /api/notifications/:id — delete a notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userAuth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    await deleteNotification(id, userId);
    return res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
