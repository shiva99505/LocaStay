import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    propertyId?: string;
    category?: string;
    title?: string;
    description?: string;
    priority?: string;
  };

  if (!body.category || !body.title || !body.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const complaint = await prisma.complaint.create({
    data: {
      userId: session.user.id,
      propertyId: body.propertyId,
      category: body.category,
      title: body.title,
      description: body.description,
      priority: body.priority ?? 'MEDIUM',
      status: 'OPEN',
    },
  });

  return NextResponse.json({ complaint }, { status: 201 });
}
