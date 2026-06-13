/**
 * GET  /api/properties/[id]/save  — check if saved
 * POST /api/properties/[id]/save  — toggle saved state
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ saved: false });

  const { id } = await params;

  const saved = await prisma.savedProperty.findFirst({
    where: { userId: session.user.id, propertyId: id },
  });

  return NextResponse.json({ saved: !!saved });
}

export async function POST(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.savedProperty.findFirst({
    where: { userId: session.user.id, propertyId: id },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  } else {
    await prisma.savedProperty.create({
      data: { userId: session.user.id, propertyId: id },
    });
    return NextResponse.json({ saved: true });
  }
}
