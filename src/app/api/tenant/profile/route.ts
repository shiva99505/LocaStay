/**
 * GET   /api/tenant/profile — fetch own tenant profile
 * PATCH /api/tenant/profile — update tenant profile fields
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const schema = z.object({
  name:           z.string().trim().min(2).max(80).optional(),
  phone:          z.string().trim().regex(/^[6-9]\d{9}$/).optional(),
  bio:            z.string().trim().max(500).optional(),
  address:        z.string().trim().max(200).optional(),
  village:        z.string().trim().max(80).optional(),
  city:           z.string().trim().max(80).optional(),
  district:       z.string().trim().max(80).optional(),
  state:          z.string().trim().max(80).optional(),
  pincode:        z.string().trim().regex(/^\d{6}$/).optional(),
  occupation:     z.string().trim().max(80).optional(),
  monthlyIncome:  z.number().int().positive().optional(),
  monthly_income: z.number().int().positive().optional(),
  familySize:     z.number().int().min(1).max(20).optional(),
  family_size:    z.number().int().min(1).max(20).optional(),
  avatar:         z.string().url().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;

  // Update User fields (name, phone, avatar)
  if (d.name || d.phone || d.avatar) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(d.name   && { name: d.name }),
        ...(d.phone  && { phone: d.phone }),
        ...(d.avatar && { avatar: d.avatar }),
      },
    });
  }

  // Upsert Profile fields
  const profileData = {
    bio:          d.bio,
    address:      d.address,
    village:      d.village,
    city:         d.city,
    district:     d.district,
    state:        d.state,
    pincode:      d.pincode,
    occupation:   d.occupation,
    monthlyIncome: d.monthlyIncome ?? d.monthly_income,
    familySize:   d.familySize ?? d.family_size,
  };
  const cleanProfile = Object.fromEntries(Object.entries(profileData).filter(([, v]) => v !== undefined));

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...cleanProfile },
    update: cleanProfile,
  });

  return NextResponse.json({ success: true, profile });
}
