/**
 * GET   /api/landlord/profile       — get landlord profile
 * PATCH /api/landlord/profile       — update landlord profile
 * GET   /api/landlord/dashboard     — dashboard stats
 * GET   /api/landlord/leads         — list leads
 * PATCH /api/landlord/leads/:id     — update lead status
 * POST  /api/landlord/remind/:tenantId — send rent reminder notification
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { authenticate, requireLandlord } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();
router.use(authenticate, requireLandlord);

// GET /api/landlord/profile
router.get('/profile', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const profile = await prisma.landlordProfile.findUnique({
    where:   { userId: user.id },
    include: { user: { select: { name: true, email: true, phone: true, avatar: true, isVerified: true } } },
  });

  res.json({ data: profile });
});

// PATCH /api/landlord/profile
router.patch('/profile', async (req: Request, res: Response) => {
  const schema = z.object({
    businessName: z.string().trim().max(100).optional(),
    bio:          z.string().max(500).optional(),
    address:      z.string().trim().optional(),
    city:         z.string().trim().optional(),
    state:        z.string().trim().optional(),
    bankAccount:  z.string().trim().optional(),
    ifscCode:     z.string().trim().optional(),
    upiId:        z.string().trim().optional(),
    panNumber:    z.string().trim().optional(),
    gstNumber:    z.string().trim().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { user } = req as AuthenticatedRequest;

  const updated = await prisma.landlordProfile.update({
    where: { userId: user.id },
    data:  parsed.data,
  });

  res.json({ data: updated });
});

// GET /api/landlord/dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!lp) { res.status(400).json({ error: 'Landlord profile not found' }); return; }

  const [properties, pendingBookings, pendingRent, newLeads] = await Promise.all([
    prisma.property.findMany({
      where:  { landlordId: lp.id },
      select: { id: true, status: true, rent: true, occupiedRooms: true, totalRooms: true, views: true, rating: true },
    }),
    prisma.booking.count({ where: { property: { landlordId: lp.id }, status: 'PENDING' } }),
    prisma.rentPayment.count({ where: { property: { landlordId: lp.id }, status: { in: ['PENDING', 'OVERDUE'] } } }),
    prisma.lead.count({ where: { landlordId: lp.id, status: 'NEW' } }),
  ]);

  const totalRent  = properties.reduce((s: number, p: { rent: number }) => s + p.rent, 0);
  const occupied   = properties.filter((p: { status: string }) => p.status === 'OCCUPIED').length;
  const available  = properties.filter((p: { status: string }) => p.status === 'AVAILABLE').length;
  const totalViews = properties.reduce((s: number, p: { views: number }) => s + p.views, 0);

  res.json({
    total_properties:  properties.length,
    occupied,
    available,
    total_rent:        totalRent,
    total_views:       totalViews,
    pending_bookings:  pendingBookings,
    pending_rent:      pendingRent,
    new_leads:         newLeads,
  });
});

// GET /api/landlord/leads
router.get('/leads', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!lp) { res.status(400).json({ error: 'Landlord profile not found' }); return; }

  const leads = await prisma.lead.findMany({
    where:   { landlordId: lp.id },
    include: {
      tenant:   { select: { name: true, phone: true } },
      property: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: leads });
});

// PATCH /api/landlord/leads/:id
router.patch('/leads/:id', async (req: Request<{ id: string }>, res: Response) => {
  const schema = z.object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid status' }); return; }

  const { user } = req as AuthenticatedRequest;

  const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, select: { landlordId: true } });

  if (!lead || lead.landlordId !== lp?.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data:  { status: parsed.data.status },
  });
  res.json({ data: updated });
});

// POST /api/landlord/remind/:tenantId
router.post('/remind/:tenantId', async (req: Request<{ tenantId: string }>, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!lp) { res.status(400).json({ error: 'Landlord profile not found' }); return; }

  const overduePayments = await prisma.rentPayment.findMany({
    where: {
      tenantId:  req.params.tenantId,
      status:    { in: ['PENDING', 'OVERDUE'] },
      property:  { landlordId: lp.id },
    },
    select: { id: true },
  });

  if (!overduePayments.length) {
    res.status(400).json({ error: 'No pending/overdue payments found for this tenant' });
    return;
  }

  await prisma.notification.create({
    data: {
      userId:  req.params.tenantId,
      type:    'PAYMENT',
      title:   'Rent Reminder',
      message: `Friendly reminder: You have ${overduePayments.length} pending rent payment(s). Please pay at your earliest convenience.`,
      link:    '/tenant/rent',
    },
  });

  res.json({ success: true, payments_reminded: overduePayments.length });
});

export default router;
