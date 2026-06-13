/**
 * GET  /api/notifications       — list notifications (with unread count)
 * POST /api/notifications/read  — mark one or all as read
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const data = await prisma.notification.findMany({
    where:   { userId: user.id },
    select:  { id: true, title: true, message: true, type: true, isRead: true, link: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });

  const unreadCount = data.filter((n: { isRead: boolean }) => !n.isRead).length;
  res.json({ data, unread_count: unreadCount });
});

// POST /api/notifications/read
router.post('/read', authenticate, async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.body as { id?: string };

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data:  { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data:  { isRead: true },
    });
  }

  res.json({ success: true });
});

export default router;
