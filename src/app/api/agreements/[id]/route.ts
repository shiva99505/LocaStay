import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

async function getLandlordProfileId(userId: string): Promise<string | null> {
  const lp = await prisma.landlordProfile.findUnique({ where: { userId }, select: { id: true } });
  return lp?.id ?? null;
}

// GET — view agreement (tenant or landlord)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const landlordProfileId = session.user.role === 'LANDLORD'
    ? await getLandlordProfileId(session.user.id)
    : null;

  const agreement = await prisma.agreement.findFirst({
    where: {
      id,
      OR: [
        { tenantId: session.user.id },
        ...(landlordProfileId ? [{ landlordId: landlordProfileId }] : []),
      ],
    },
    include: {
      property: { select: { title: true, address: true, city: true, state: true } },
      booking: { select: { tenant: { select: { name: true, phone: true } } } },
    },
  });

  if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

  return NextResponse.json({ agreement });
}

// PATCH — sign agreement (tenant or landlord side)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { action?: string };

  if (body.action !== 'SIGN') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const landlordProfileId = session.user.role === 'LANDLORD'
    ? await getLandlordProfileId(session.user.id)
    : null;

  const agreement = await prisma.agreement.findFirst({
    where: {
      id,
      OR: [
        { tenantId: session.user.id },
        ...(landlordProfileId ? [{ landlordId: landlordProfileId }] : []),
      ],
    },
  });

  if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

  const isTenant = agreement.tenantId === session.user.id;
  const isLandlord = landlordProfileId !== null && agreement.landlordId === landlordProfileId;

  const updateData: Record<string, unknown> = {};

  if (isTenant && !agreement.tenantSignedAt) {
    updateData.tenantSignedAt = new Date();
  } else if (isLandlord && !agreement.landlordSignedAt) {
    updateData.landlordSignedAt = new Date();
  } else {
    return NextResponse.json({ error: 'Already signed or not authorized' }, { status: 409 });
  }

  const tenantSigned = isTenant ? true : !!agreement.tenantSignedAt;
  const landlordSigned = isLandlord ? true : !!agreement.landlordSignedAt;

  updateData.status = tenantSigned && landlordSigned ? 'ACTIVE' : 'PENDING_SIGNATURE';

  const updated = await prisma.agreement.update({ where: { id }, data: updateData });

  // Notify other party
  if (isTenant) {
    // Find landlord's userId to notify
    const lp = await prisma.landlordProfile.findUnique({ where: { id: agreement.landlordId }, select: { userId: true } });
    if (lp) {
      await prisma.notification.create({
        data: {
          userId: lp.userId,
          type: 'AGREEMENT',
          title: 'Tenant Signed Agreement',
          message: `Your tenant has signed the rental agreement.${tenantSigned && landlordSigned ? ' Agreement is now active.' : ' Awaiting your signature.'}`,
          link: '/landlord/agreements',
        },
      });
    }
  } else {
    await prisma.notification.create({
      data: {
        userId: agreement.tenantId,
        type: 'AGREEMENT',
        title: 'Landlord Signed Agreement',
        message: `Your landlord has signed the rental agreement.${tenantSigned && landlordSigned ? ' Agreement is now active.' : ''}`,
        link: '/tenant/agreements',
      },
    });
  }

  revalidatePath('/tenant/agreements');
  revalidatePath('/landlord/agreements');

  return NextResponse.json({ success: true, agreement: updated });
}
