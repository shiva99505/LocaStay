import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: propertyId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; reason?: string };
  const { action, reason } = body;

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'Invalid action. Use "APPROVE" or "REJECT".' }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { landlord: { select: { userId: true } } },
  });
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  if (action === 'APPROVE') {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'AVAILABLE' },
    });
    await prisma.notification.create({
      data: {
        userId:  property.landlord.userId,
        type:    'SYSTEM',
        title:   'Property Approved',
        message: `Your property "${property.title}" has been approved and is now live on LocaStay.`,
        link:    '/landlord/properties',
      },
    });
  } else {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'REJECTED' },
    });
    await prisma.notification.create({
      data: {
        userId:  property.landlord.userId,
        type:    'SYSTEM',
        title:   'Property Rejected',
        message: `Your property "${property.title}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
        link:    '/landlord/properties',
      },
    });
  }

  revalidatePath('/admin/properties');
  revalidatePath('/admin');
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: propertyId } = await params;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { landlord: { select: { userId: true } } },
  });
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'DELISTED' },
  });

  await prisma.notification.create({
    data: {
      userId:  property.landlord.userId,
      type:    'SYSTEM',
      title:   'Property Removed',
      message: `Your property "${property.title}" has been removed by admin.`,
      link:    '/landlord/properties',
    },
  });

  revalidatePath('/admin/properties');
  revalidatePath('/admin');
  return NextResponse.json({ success: true });
}
