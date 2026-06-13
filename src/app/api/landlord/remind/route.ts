import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as {
    bulk?: boolean;
    paymentIds?: string[];
    tenantIds?: string[];
    tenantId?: string;
    paymentId?: string;
    period?: string;
    amount?: number;
  };

  if (body.bulk) {
    const { paymentIds = [], tenantIds = [] } = body;
    if (!paymentIds.length) return NextResponse.json({ success: true, count: 0 });

    const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
    if (!landlordProfile) return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });

    const payments = await prisma.rentPayment.findMany({
      where: { id: { in: paymentIds }, status: 'PENDING', property: { landlordId: landlordProfile.id } },
      include: { property: { select: { title: true } } },
    });

    const notifData = payments
      .filter((p) => tenantIds.includes(p.tenantId))
      .map((p) => ({
        userId: p.tenantId,
        type: 'RENT_REMINDER',
        title: 'Rent Due Reminder',
        message: `Your rent of ₹${p.amount.toLocaleString('en-IN')} for ${p.period} (${p.property.title}) is due on ${new Date(p.dueDate).toLocaleDateString('en-IN')}.`,
        link: '/tenant/stay',
      }));

    if (notifData.length) await prisma.notification.createMany({ data: notifData });

    return NextResponse.json({ success: true, count: notifData.length });
  }

  const { tenantId, paymentId, period, amount } = body;
  if (!tenantId || !paymentId) return NextResponse.json({ error: 'tenantId and paymentId required' }, { status: 400 });

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });

  const payment = await prisma.rentPayment.findFirst({
    where: { id: paymentId, status: 'PENDING' },
    include: { property: { select: { title: true, landlordId: true } } },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  if (payment.property.landlordId !== landlordProfile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.notification.create({
    data: {
      userId: tenantId,
      type: 'RENT_REMINDER',
      title: 'Rent Due Reminder',
      message: `Your rent of ₹${(amount ?? payment.amount).toLocaleString('en-IN')} for ${period ?? payment.period} (${payment.property.title}) is due. Please pay as soon as possible to avoid late fees.`,
      link: '/tenant/stay',
    },
  });

  return NextResponse.json({ success: true });
}
