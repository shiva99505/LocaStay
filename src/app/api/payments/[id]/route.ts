/**
 * PATCH /api/payments/[id] — tenant marks rent as paid
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const schema = z.object({
  method:        z.enum(['UPI', 'NEFT', 'CASH', 'CARD']).default('UPI'),
  transactionId: z.string().trim().min(1).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: paymentId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const payment = await prisma.rentPayment.findFirst({
    where: { id: paymentId, tenantId: session.user.id },
    include: { property: { select: { title: true } } },
  });

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  if (payment.status === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 409 });

  const txId = parsed.data.transactionId ?? `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const receiptNumber = `RCPT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const updated = await prisma.rentPayment.update({
    where: { id: paymentId },
    data: {
      status:        'PAID',
      paidDate:      new Date(),
      method:        parsed.data.method,
      transactionId: txId,
      receiptNumber,
    },
  });

  await prisma.notification.create({
    data: {
      userId:  session.user.id,
      type:    'PAYMENT',
      title:   'Rent Payment Successful',
      message: `Rent paid for ${payment.period} — "${payment.property.title}". Receipt: ${receiptNumber}`,
      link:    '/tenant/rent',
    },
  });

  return NextResponse.json({ success: true, receiptNumber, payment: updated });
}
