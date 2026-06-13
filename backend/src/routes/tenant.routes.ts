/**
 * GET   /api/tenant/profile     — get profile
 * PATCH /api/tenant/profile     — update profile
 * GET   /api/tenant/bookings    — my bookings
 * GET   /api/tenant/saved       — saved properties
 * POST  /api/tenant/complaints  — file complaint
 * GET   /api/tenant/complaints  — list complaints
 * POST  /api/tenant/support     — create support ticket
 * GET   /api/tenant/support     — list my tickets
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();
router.use(authenticate);

// GET /api/tenant/profile
router.get('/profile', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const data = await prisma.user.findUnique({
    where:   { id: user.id },
    include: { profile: true },
  });
  res.json({ data });
});

// PATCH /api/tenant/profile
router.patch('/profile', async (req: Request, res: Response) => {
  const schema = z.object({
    name:     z.string().trim().min(2).optional(),
    phone:    z.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    avatar:   z.string().url().optional(),
    language: z.enum(['en', 'hi', 'mr', 'gu', 'pa']).optional(),
    bio:      z.string().max(300).optional(),
    address:  z.string().optional(),
    city:     z.string().optional(),
    state:    z.string().optional(),
    occupation:    z.string().optional(),
    aadhaarNumber: z.string().optional(),
    panNumber:     z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { user } = req as AuthenticatedRequest;
  const { bio, address, city, state, occupation, aadhaarNumber, panNumber, ...userFields } = parsed.data;

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  userFields,
    }),
    ...(bio || address || city || state || occupation || aadhaarNumber || panNumber
      ? [prisma.profile.upsert({
          where:  { userId: user.id },
          update: { bio, address, city, state, occupation, aadhaarNumber, panNumber },
          create: { userId: user.id, bio, address, city, state, occupation, aadhaarNumber, panNumber },
        })]
      : []),
  ]);

  res.json({ data: updatedUser });
});

// GET /api/tenant/bookings
router.get('/bookings', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const data = await prisma.booking.findMany({
    where:   { tenantId: user.id },
    include: {
      property: { select: { title: true, coverImage: true, city: true, rent: true, landlordId: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });
  res.json({ data });
});

// GET /api/tenant/saved
router.get('/saved', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const rows = await prisma.savedProperty.findMany({
    where:   { userId: user.id },
    include: {
      property: { select: { id: true, title: true, type: true, rent: true, city: true, coverImage: true, rating: true, isVerified: true } },
    },
  });
  res.json({ data: rows.map((r: { property: unknown }) => r.property) });
});

// POST /api/tenant/complaints
router.post('/complaints', async (req: Request, res: Response) => {
  const schema = z.object({
    propertyId:  z.string().cuid(),
    category:    z.string().trim().min(3),
    title:       z.string().trim().min(5),
    description: z.string().trim().min(20).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { user } = req as AuthenticatedRequest;
  const data = await prisma.complaint.create({
    data: {
      userId:      user.id,
      propertyId:  parsed.data.propertyId,
      category:    parsed.data.category,
      title:       parsed.data.title,
      description: parsed.data.description,
      status:      'OPEN',
    },
  });

  res.status(201).json({ data });
});

// GET /api/tenant/complaints
router.get('/complaints', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const data = await prisma.complaint.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data });
});

// POST /api/tenant/support
router.post('/support', async (req: Request, res: Response) => {
  const schema = z.object({
    subject:     z.string().trim().min(5),
    description: z.string().trim().min(20),
    category:    z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { user } = req as AuthenticatedRequest;
  const data = await prisma.supportTicket.create({
    data: {
      userId:      user.id,
      subject:     parsed.data.subject,
      description: parsed.data.description,
      category:    parsed.data.category ?? 'OTHER',
      status:      'OPEN',
    },
  });

  res.status(201).json({ data });
});

// GET /api/tenant/support
router.get('/support', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const data = await prisma.supportTicket.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data });
});

export default router;
