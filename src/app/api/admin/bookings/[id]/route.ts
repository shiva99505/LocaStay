import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string };
  const { action } = body;

  if (action !== 'APPROVED' && action !== 'REJECTED') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { select: { title: true } } },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: action, respondedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: booking.tenantId,
      type: 'BOOKING',
      title: action === 'APPROVED' ? 'Booking Approved' : 'Booking Rejected',
      message:
        action === 'APPROVED'
          ? `Your booking for "${booking.property.title}" has been approved.`
          : `Your booking for "${booking.property.title}" was rejected by admin.`,
      link: '/tenant/stay',
    },
  });

  return NextResponse.json({ success: true });
}
