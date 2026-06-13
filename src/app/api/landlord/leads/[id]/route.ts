import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

// PATCH — landlord update lead status
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as { status?: string };

  const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });

  const lead = await prisma.lead.findFirst({
    where: { id, landlordId: landlordProfile.id },
  });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const updated = await prisma.lead.update({
    where: { id },
    data: { status: body.status },
  });

  revalidatePath('/landlord/leads');

  return NextResponse.json({ success: true, lead: updated });
}
