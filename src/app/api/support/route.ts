import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    subject?: string;
    description?: string;
    category?: string;
    priority?: string;
  };

  const { subject, description, category = 'OTHER', priority = 'MEDIUM' } = body;
  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'OPEN',
    },
  });

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'SUPPORT',
      title: 'Support Ticket Received',
      message: `Your support ticket #${ticket.id.slice(-6).toUpperCase()} has been received. We'll respond within 24 hours.`,
      link: '/tenant/support',
    },
  });

  return NextResponse.json({ success: true, ticketId: ticket.id });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tickets });
}
