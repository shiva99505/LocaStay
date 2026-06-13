import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const schema = z.object({
  propertyId:     z.string().min(1),
  moveInDate:     z.string().datetime({ offset: true }),
  durationMonths: z.number().int().min(1).max(60).default(11),
  message:        z.string().trim().max(500).optional(),
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

  const { propertyId, moveInDate, durationMonths, message } = parsed.data;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, title: true, status: true, landlord: { select: { userId: true } } },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  if (property.status !== 'AVAILABLE') {
    return NextResponse.json({ error: 'This property is not available for booking.' }, { status: 409 });
  }

  const existing = await prisma.booking.findFirst({
    where: { tenantId: session.user.id, propertyId, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending or active booking for this property.' }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      tenantId: session.user.id,
      propertyId,
      moveInDate: new Date(moveInDate),
      durationMonths,
      message,
    },
  });

  await prisma.notification.create({
    data: {
      userId:  property.landlord.userId,
      type:    'BOOKING',
      title:   'New Booking Request',
      message: `${session.user.name} has requested to book "${property.title}".`,
      link:    `/landlord/bookings?id=${booking.id}`,
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
