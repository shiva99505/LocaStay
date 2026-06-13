/**
 * GET   /api/landlord/profile — fetch own landlord profile
 * PATCH /api/landlord/profile — create or update landlord profile
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const schema = z.object({
  businessName: z.string().trim().max(100).optional(),
  business_name: z.string().trim().max(100).optional(),
  bio:          z.string().trim().max(500).optional(),
  address:      z.string().trim().max(200).optional(),
  city:         z.string().trim().max(80).optional(),
  state:        z.string().trim().max(80).optional(),
  upiId:        z.string().trim().max(50).optional(),
  upi_id:       z.string().trim().max(50).optional(),
  panNumber:    z.string().trim().max(10).optional(),
  pan_number:   z.string().trim().max(10).optional(),
  gstNumber:    z.string().trim().max(15).optional(),
  gst_number:   z.string().trim().max(15).optional(),
  bankAccount:  z.string().trim().max(20).optional(),
  bank_account: z.string().trim().max(20).optional(),
  ifscCode:     z.string().trim().max(11).optional(),
  ifsc_code:    z.string().trim().max(11).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.landlordProfile.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const data = {
    businessName: d.businessName ?? d.business_name,
    bio:          d.bio,
    address:      d.address,
    city:         d.city,
    state:        d.state,
    upiId:        d.upiId ?? d.upi_id,
    panNumber:    d.panNumber ?? d.pan_number,
    gstNumber:    d.gstNumber ?? d.gst_number,
    bankAccount:  d.bankAccount ?? d.bank_account,
    ifscCode:     d.ifscCode ?? d.ifsc_code,
  };
  // Remove undefined values
  const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

  const profile = await prisma.landlordProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...cleanData },
    update: cleanData,
  });

  return NextResponse.json({ success: true, profile });
}
