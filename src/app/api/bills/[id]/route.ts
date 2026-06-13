import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

// PATCH — tenant pay a bill
export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const bill = await prisma.bill.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (bill.status === 'PAID') return NextResponse.json({ error: 'Bill already paid' }, { status: 409 });

  const receiptNumber = `BILL-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      status: 'PAID',
      paidDate: new Date(),
      billNumber: receiptNumber,
    },
  });

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'PAYMENT',
      title: `${bill.type} Bill Paid`,
      message: `You have successfully paid ₹${bill.amount.toLocaleString('en-IN')} for your ${bill.type.toLowerCase()} bill. Receipt: ${receiptNumber}`,
      link: '/tenant/bills',
    },
  });

  return NextResponse.json({ success: true, receiptNumber, bill: updated });
}
