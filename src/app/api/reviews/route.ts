import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const schema = z.object({
  propertyId: z.string().min(1),
  rating:     z.number().int().min(1).max(5),
  comment:    z.string().trim().max(1000).optional(),
  images:     z.array(z.string().url()).max(5).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { propertyId, rating, comment, images } = parsed.data;

  const approvedBooking = await prisma.booking.findFirst({
    where: { tenantId: session.user.id, propertyId, status: 'APPROVED' },
  });
  if (!approvedBooking) {
    return NextResponse.json({ error: 'You can only review properties you have booked.' }, { status: 403 });
  }

  const existing = await prisma.review.findFirst({
    where: { tenantId: session.user.id, propertyId },
  });
  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this property.' }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      tenantId:   session.user.id,
      propertyId,
      rating,
      comment,
      images:     JSON.stringify(images ?? []),
    },
  });

  // Update property rating average
  const { _avg } = await prisma.review.aggregate({
    where: { propertyId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      rating:      _avg.rating ?? 0,
      reviewCount: await prisma.review.count({ where: { propertyId } }),
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
