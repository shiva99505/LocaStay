/**
 * GET    /api/properties          — list with filters (public)
 * POST   /api/properties          — create (LANDLORD)
 * GET    /api/properties/:id      — single property + reviews (public)
 * PATCH  /api/properties/:id      — update (LANDLORD owner or ADMIN)
 * DELETE /api/properties/:id      — soft-delist
 * GET    /api/properties/:id/save — check saved status
 * POST   /api/properties/:id/save — toggle save
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { authenticate, requireLandlord } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();

// GET /api/properties
router.get('/', async (req: Request, res: Response) => {
  const { type, city, state, minRent, maxRent, rooms, search, page = '1', limit = '12' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: { in: ['AVAILABLE', 'OCCUPIED'] },
    ...(type  && { type }),
    ...(state && { state }),
    ...(city  && { city:       { contains: city   } }),
    ...(minRent && { rent:     { gte: Number(minRent) } }),
    ...(maxRent && { rent:     { lte: Number(maxRent) } }),
    ...(rooms && { totalRooms: { gte: Number(rooms)   } }),
    ...(search && {
      OR: [
        { title:   { contains: search } },
        { city:    { contains: search } },
        { village: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      select: {
        id: true, title: true, type: true, rent: true, deposit: true,
        city: true, state: true, village: true, coverImage: true, images: true,
        rating: true, reviewCount: true, isVerified: true, isFeatured: true,
        totalRooms: true, occupiedRooms: true, latitude: true, longitude: true,
        status: true, landlordId: true, createdAt: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  res.json({ data, page: pageNum, limit: pageSize, total });
});

// POST /api/properties
router.post('/', authenticate, requireLandlord, async (req: Request, res: Response) => {
  const schema = z.object({
    title:           z.string().trim().min(5),
    type:            z.enum(['HOUSE', 'PG', 'HOSTEL', 'FLAT', 'ROOM', 'FARMHOUSE']),
    description:     z.string().trim().optional(),
    rent:            z.number().positive(),
    deposit:         z.number().min(0).default(0),
    address:         z.string().trim().min(5),
    village:         z.string().trim().optional(),
    city:            z.string().trim().min(2),
    state:           z.string().trim().min(2),
    pincode:         z.string().regex(/^\d{6}$/),
    latitude:        z.number().min(-90).max(90),
    longitude:       z.number().min(-180).max(180),
    totalRooms:      z.number().int().positive().default(1),
    availableFrom:   z.string().optional(),
    distanceToSchool:   z.number().min(0).optional(),
    distanceToHospital: z.number().min(0).optional(),
    distanceToMarket:   z.number().min(0).optional(),
    distanceToBusStand: z.number().min(0).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { user } = req as AuthenticatedRequest;
  const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!lp) { res.status(400).json({ error: 'Landlord profile not found' }); return; }

  const { availableFrom, ...rest } = parsed.data;
  const property = await prisma.property.create({
    data: {
      ...rest,
      landlordId:    lp.id,
      status:        'PENDING',
      availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
    },
  });

  res.status(201).json({ data: property });
});

// GET /api/properties/:id
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  const [property, reviews] = await Promise.all([
    prisma.property.findUnique({
      where:   { id },
      include: { landlord: { include: { user: { select: { name: true, avatar: true, phone: true } } } } },
    }),
    prisma.review.findMany({
      where:   { propertyId: id },
      include: { tenant: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take:    20,
    }),
  ]);

  if (!property) { res.status(404).json({ error: 'Property not found' }); return; }

  prisma.property.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});

  res.json({ data: property, reviews });
});

// PATCH /api/properties/:id
router.patch('/:id', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;

  const property = await prisma.property.findUnique({ where: { id }, select: { landlordId: true } });
  if (!property) { res.status(404).json({ error: 'Property not found' }); return; }

  if (user.role !== 'ADMIN') {
    const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp || lp.id !== property.landlordId) {
      res.status(403).json({ error: 'You do not own this property' }); return;
    }
  }

  const SAFE = ['title', 'description', 'rent', 'deposit', 'totalRooms', 'address',
    'coverImage', 'village', 'city', 'state', 'pincode',
    'distanceToSchool', 'distanceToHospital', 'distanceToMarket', 'distanceToBusStand'];

  const updates = Object.fromEntries(
    Object.entries(req.body as Record<string, unknown>).filter(([k]) => SAFE.includes(k))
  );

  const updated = await prisma.property.update({ where: { id }, data: updates });
  res.json({ data: updated });
});

// DELETE /api/properties/:id
router.delete('/:id', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { user } = req as AuthenticatedRequest;

  const property = await prisma.property.findUnique({ where: { id }, select: { landlordId: true } });
  if (!property) { res.status(404).json({ error: 'Property not found' }); return; }

  if (user.role !== 'ADMIN') {
    const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp || lp.id !== property.landlordId) {
      res.status(403).json({ error: 'You do not own this property' }); return;
    }
  }

  await prisma.property.update({ where: { id }, data: { status: 'DELISTED' } });
  res.json({ success: true });
});

// GET /api/properties/:id/save
router.get('/:id/save', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const saved = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId: req.params.id } },
  });
  res.json({ saved: !!saved });
});

// POST /api/properties/:id/save
router.post('/:id/save', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const key = { userId: user.id, propertyId: req.params.id };

  const existing = await prisma.savedProperty.findUnique({ where: { userId_propertyId: key } });
  if (existing) {
    await prisma.savedProperty.delete({ where: { userId_propertyId: key } });
    res.json({ saved: false });
  } else {
    await prisma.savedProperty.create({ data: key });
    res.json({ saved: true });
  }
});

export default router;
