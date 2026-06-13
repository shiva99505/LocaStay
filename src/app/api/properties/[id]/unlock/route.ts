/**
 * GET  /api/properties/[id]/unlock — check if current tenant has unlocked this property
 * POST /api/properties/[id]/unlock — pay ₹3 and unlock contact + booking for this property
 *
 * Once a tenant pays ₹3 for a property (either via contact or booking),
 * both contact and booking are unlocked for that specific property.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: propertyId } = await params;

  const unlock = await prisma.propertyUnlock.findUnique({
    where: { tenantId_propertyId: { tenantId: session.user.id, propertyId } },
  });

  return NextResponse.json({ unlocked: unlock !== null, paidAt: unlock?.paidAt ?? null });
}

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: propertyId } = await params;

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const unlock = await prisma.propertyUnlock.upsert({
    where: { tenantId_propertyId: { tenantId: session.user.id, propertyId } },
    create: { tenantId: session.user.id, propertyId, amount: 3 },
    update: {},
  });

  return NextResponse.json({ unlocked: true, paidAt: unlock.paidAt }, { status: 201 });
}
