/**
 * GET   /api/reviews?propertyId= — list reviews for a property
 * POST  /api/reviews             — create review (tenant with APPROVED booking)
 * PATCH /api/reviews/:id         — update review / add landlord reply
 * DELETE /api/reviews/:id        — delete review
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();

// GET /api/reviews
router.get('/', async (req: Request, res: Response) => {
  const propertyId = req.query.propertyId as string;
  if (!propertyId) { res.status(400).json({ error: 'propertyId query param is required' }); return; }

  const data = await prisma.review.findMany({
    where:   { propertyId },
    include: { tenant: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data });
});

// POST /api/reviews
router.post('/', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    propertyId: z.string().cuid(),
    rating:     z.number().int().min(1).max(5),
    comment:    z.string().trim().min(10).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { user } = req as AuthenticatedRequest;

  const booking = await prisma.booking.findFirst({
    where: { tenantId: user.id, propertyId: parsed.data.propertyId, status: 'APPROVED' },
    select: { id: true },
  });
  if (!booking) {
    res.status(403).json({ error: 'You can only review a property you have an approved booking for' });
    return;
  }

  const dup = await prisma.review.findFirst({
    where: { tenantId: user.id, propertyId: parsed.data.propertyId },
  });
  if (dup) { res.status(409).json({ error: 'You have already reviewed this property' }); return; }

  const data = await prisma.review.create({
    data: {
      tenantId:   user.id,
      propertyId: parsed.data.propertyId,
      rating:     parsed.data.rating,
      comment:    parsed.data.comment,
    },
  });

  // Update property rating average
  const allReviews = await prisma.review.findMany({
    where:  { propertyId: parsed.data.propertyId },
    select: { rating: true },
  });
  const avgRating = allReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / allReviews.length;
  await prisma.property.update({
    where: { id: parsed.data.propertyId },
    data:  { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length },
  });

  res.status(201).json({ data });
});

// PATCH /api/reviews/:id
router.patch('/:id', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const review = await prisma.review.findUnique({
    where:   { id: req.params.id },
    include: { property: { select: { landlordId: true, landlord: { select: { userId: true } } } } },
  });
  if (!review) { res.status(404).json({ error: 'Review not found' }); return; }

  const isAuthor   = review.tenantId === user.id;
  const isLandlord = review.property.landlord.userId === user.id;

  if (!isAuthor && !isLandlord && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const updates: Record<string, unknown> = {};
  if ((isAuthor || user.role === 'ADMIN') && req.body.rating)  updates.rating  = Number(req.body.rating);
  if ((isAuthor || user.role === 'ADMIN') && req.body.comment) updates.comment = req.body.comment;
  if ((isLandlord || user.role === 'ADMIN') && req.body.landlordReply) {
    updates.landlordReply = req.body.landlordReply;
  }

  const data = await prisma.review.update({ where: { id: req.params.id }, data: updates });
  res.json({ data });
});

// DELETE /api/reviews/:id
router.delete('/:id', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const review = await prisma.review.findUnique({
    where:  { id: req.params.id },
    select: { tenantId: true },
  });
  if (!review) { res.status(404).json({ error: 'Review not found' }); return; }
  if (review.tenantId !== user.id && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
