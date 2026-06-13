import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

// PATCH — admin resolve or update support ticket
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as { action?: string; message?: string };
  const { action, message } = body;

  if (!['RESOLVE', 'CLOSE', 'IN_PROGRESS'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Invalid action. Use RESOLVE, CLOSE, or IN_PROGRESS' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const statusMap: Record<string, string> = {
    RESOLVE: 'RESOLVED',
    CLOSE: 'CLOSED',
    IN_PROGRESS: 'IN_PROGRESS',
  };

  const newStatus = statusMap[action!];

  await prisma.supportTicket.update({
    where: { id },
    data: { status: newStatus },
  });

  // Notify the user about ticket status change
  if (action === 'RESOLVE' || action === 'IN_PROGRESS') {
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'SUPPORT',
        title: action === 'RESOLVE' ? 'Support Ticket Resolved' : 'Support Ticket Update',
        message: action === 'RESOLVE'
          ? `Your support ticket "${ticket.subject}" has been resolved.${message ? ` Note: ${message}` : ''}`
          : `Your support ticket "${ticket.subject}" is now being worked on by our team.`,
        link: '/tenant/support',
      },
    });
  }

  revalidatePath('/admin/support');

  return NextResponse.json({ success: true });
}
