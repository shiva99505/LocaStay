/**
 * GET    /api/properties/[id]  — property detail (increments views)
 * PATCH  /api/properties/[id]  — landlord updates listing
 * DELETE /api/properties/[id]  — landlord deletes property
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      landlord: {
        include: {
          user: { select: { name: true, phone: true, avatar: true } },
        },
      },
      amenities: true,
      reviews: {
        include: { tenant: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  // Non-blocking view increment
  prisma.property.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});

  return NextResponse.json({ property });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, landlord: { select: { userId: true } } },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const isOwner = property.landlord.userId === session.user.id;
  if (!isOwner && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ALLOWED = [
    'title', 'description', 'type', 'rent', 'deposit', 'address', 'village',
    'city', 'district', 'state', 'pincode', 'latitude', 'longitude', 'totalRooms',
    'availableFrom', 'coverImage', 'images', 'squareFeet',
    'distanceToSchool', 'distanceToHospital', 'distanceToMarket', 'distanceToBusStand',
  ] as const;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const safeUpdate = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED.includes(k as never))
  );

  const updated = await prisma.property.update({ where: { id }, data: safeUpdate as never });
  return NextResponse.json({ property: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, landlord: { select: { userId: true } } },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const isOwner = property.landlord.userId === session.user.id;
  if (!isOwner && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
