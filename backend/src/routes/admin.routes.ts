/**
 * GET   /api/admin/dashboard          — stats overview
 * GET   /api/admin/users              — list users (paginated)
 * PATCH /api/admin/users/:id          — verify / suspend / unsuspend
 * GET   /api/admin/properties         — list all properties
 * PATCH /api/admin/properties/:id     — approve / reject
 * GET   /api/admin/bookings           — list all bookings
 * GET   /api/admin/support            — list support tickets
 * PATCH /api/admin/support/:id        — resolve / update ticket
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', async (_req: Request, res: Response) => {
  const [totalUsers, totalProperties, pendingProperties, totalBookings, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.property.count({ where: { status: 'PENDING' } }),
    prisma.booking.count(),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
  ]);

  res.json({ totalUsers, totalProperties, pendingProperties, totalBookings, openTickets });
});

// GET /api/admin/users
router.get('/users', async (req: Request, res: Response) => {
  const { role, search, page = '1' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const size    = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...(role   && { role }),
    ...(search && {
      OR: [
        { name:  { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isVerified: true, isSuspended: true, createdAt: true,
        profile: { select: { kycStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip:  (pageNum - 1) * size,
      take:  size,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data, total, page: pageNum });
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req: Request<{ id: string }>, res: Response) => {
  const schema = z.object({ action: z.enum(['VERIFY', 'SUSPEND', 'UNSUSPEND']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'action must be VERIFY, SUSPEND, or UNSUSPEND' }); return; }

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!target) { res.status(404).json({ error: 'User not found' }); return; }

  const { action } = parsed.data;
  if (action === 'VERIFY') {
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { isVerified: true } }),
      prisma.profile.upsert({
        where:  { userId: req.params.id },
        update: { kycStatus: 'VERIFIED' },
        create: { userId: req.params.id, kycStatus: 'VERIFIED' },
      }),
    ]);
  } else {
    await prisma.user.update({
      where: { id: req.params.id },
      data:  { isSuspended: action === 'SUSPEND' },
    });
  }

  const NOTIF = {
    VERIFY:    { title: 'Account Verified',   message: 'Your account has been verified by LocaStay admin.' },
    SUSPEND:   { title: 'Account Suspended',  message: 'Your account has been suspended. Contact support.' },
    UNSUSPEND: { title: 'Account Reinstated', message: 'Your account suspension has been lifted. Welcome back!' },
  };

  await prisma.notification.create({
    data: { userId: req.params.id, type: 'GENERAL', ...NOTIF[action] },
  });

  const { user: adminUser } = req as AuthenticatedRequest;
  await prisma.auditLog.create({
    data: {
      actorId:    adminUser.id,
      action:     action === 'VERIFY' ? 'VERIFY_KYC' : action === 'SUSPEND' ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      entityType: 'USER',
      entityId:   req.params.id,
    },
  });

  res.json({ success: true });
});

// GET /api/admin/properties
router.get('/properties', async (req: Request, res: Response) => {
  const { status, page = '1' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const size    = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = status ? { status } : {};

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      select: {
        id: true, title: true, type: true, city: true, state: true,
        status: true, rent: true, landlordId: true, createdAt: true,
        landlord: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip:  (pageNum - 1) * size,
      take:  size,
    }),
    prisma.property.count({ where }),
  ]);

  res.json({ data, total, page: pageNum });
});

// PATCH /api/admin/properties/:id
router.patch('/properties/:id', async (req: Request<{ id: string }>, res: Response) => {
  const schema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'action must be APPROVE or REJECT' }); return; }

  const property = await prisma.property.findUnique({
    where:   { id: req.params.id },
    select:  { title: true, landlordId: true, landlord: { select: { userId: true } } },
  });
  if (!property) { res.status(404).json({ error: 'Property not found' }); return; }

  const newStatus = parsed.data.action === 'APPROVE' ? 'AVAILABLE' : 'REJECTED';
  await prisma.property.update({
    where: { id: req.params.id },
    data:  { status: newStatus, ...(parsed.data.reason ? { rejectionReason: parsed.data.reason } : {}) },
  });

  await prisma.notification.create({
    data: {
      userId:  property.landlord.userId,
      type:    'PROPERTY',
      title:   newStatus === 'AVAILABLE' ? 'Property Approved!' : 'Property Rejected',
      message: newStatus === 'AVAILABLE'
        ? `Your property "${property.title}" has been approved and is now live.`
        : `Your property "${property.title}" was rejected. ${parsed.data.reason ? 'Reason: ' + parsed.data.reason : ''}`,
      link: '/landlord/properties',
    },
  });

  const { user: adminUser } = req as AuthenticatedRequest;
  await prisma.auditLog.create({
    data: {
      actorId:    adminUser.id,
      action:     parsed.data.action === 'APPROVE' ? 'APPROVE_PROPERTY' : 'REJECT_PROPERTY',
      entityType: 'PROPERTY',
      entityId:   req.params.id,
    },
  });

  res.json({ success: true, status: newStatus });
});

// GET /api/admin/bookings
router.get('/bookings', async (req: Request, res: Response) => {
  const { status, page = '1' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const size    = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = status ? { status } : {};

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        tenant:   { select: { name: true, phone: true } },
        property: { select: { title: true, city: true } },
      },
      orderBy: { requestedAt: 'desc' },
      skip:  (pageNum - 1) * size,
      take:  size,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ data, total, page: pageNum });
});

// GET /api/admin/support
router.get('/support', async (req: Request, res: Response) => {
  const { status = 'OPEN', page = '1' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const size    = 20;

  const [data, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where:   { status },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip:  (pageNum - 1) * size,
      take:  size,
    }),
    prisma.supportTicket.count({ where: { status } }),
  ]);

  res.json({ data, total, page: pageNum });
});

// PATCH /api/admin/support/:id
router.patch('/support/:id', async (req: Request<{ id: string }>, res: Response) => {
  const schema = z.object({
    status:   z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    response: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const ticket = await prisma.supportTicket.findUnique({
    where:  { id: req.params.id },
    select: { userId: true },
  });
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  await prisma.supportTicket.update({
    where: { id: req.params.id },
    data:  { status: parsed.data.status },
  });

  if (parsed.data.response) {
    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: req.params.id,
          senderId: (req as AuthenticatedRequest).user.id,
          message:  parsed.data.response,
          isStaff:  true,
        },
      }),
      prisma.notification.create({
        data: {
          userId:  ticket.userId,
          type:    'GENERAL',
          title:   'Support Ticket Updated',
          message: `Your support ticket has been updated: ${parsed.data.response}`,
          link:    '/tenant/support',
        },
      }),
    ]);
  }

  res.json({ success: true });
});

export default router;
