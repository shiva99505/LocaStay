import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; reason?: string };
  const { action, reason } = body;

  if (action !== 'APPROVED' && action !== 'REJECTED') {
    return NextResponse.json({ error: 'Invalid action. Use "APPROVED" or "REJECTED".' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      property: { select: { id: true, title: true, rent: true, landlord: { select: { userId: true } } } },
    },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.status !== 'PENDING') {
    return NextResponse.json({ error: 'Booking is no longer pending.' }, { status: 409 });
  }

  if (session.user.role === 'LANDLORD' && booking.property.landlord.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (action === 'APPROVED') {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'APPROVED', respondedAt: new Date() },
    });
    await prisma.property.update({
      where: { id: booking.propertyId },
      data: { occupiedRooms: { increment: 1 } },
    });

    // Auto-generate monthly rent payment records for the full booking duration
    const moveIn = new Date(booking.moveInDate);
    const rentPayments = Array.from({ length: booking.durationMonths }, (_, i) => {
      const due = new Date(moveIn.getFullYear(), moveIn.getMonth() + i, moveIn.getDate());
      const period = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
      return {
        tenantId:   booking.tenantId,
        propertyId: booking.propertyId,
        bookingId:  booking.id,
        period,
        amount:     booking.property.rent,
        dueDate:    due,
        status:     'PENDING',
      };
    });
    await prisma.rentPayment.createMany({ data: rentPayments, skipDuplicates: true });

    await prisma.notification.create({
      data: {
        userId:  booking.tenantId,
        type:    'BOOKING',
        title:   'Booking Approved!',
        message: `Your booking for "${booking.property.title}" has been approved. Move-in confirmed!`,
        link:    '/tenant/stay',
      },
    });
  } else {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'REJECTED', rejectionReason: reason, respondedAt: new Date() },
    });
    await prisma.notification.create({
      data: {
        userId:  booking.tenantId,
        type:    'BOOKING',
        title:   'Booking Rejected',
        message: `Your booking for "${booking.property.title}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
        link:    '/properties',
      },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'TENANT' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, tenantId: true, status: true },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (session.user.role === 'TENANT' && booking.tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!['PENDING', 'APPROVED'].includes(booking.status)) {
    return NextResponse.json({ error: 'Booking cannot be cancelled.' }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  });

  return NextResponse.json({ success: true });
}
