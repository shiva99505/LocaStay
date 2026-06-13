import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

const schema = z.object({
  name:     z.string().trim().min(2).max(80),
  email:    z.string().trim().toLowerCase().email(),
  phone:    z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8),
  role:     z.enum(['TENANT', 'LANDLORD']),
  language: z.enum(['en', 'hi']).default('en'),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { name, email, phone, password, role, language } = parsed.data;

  // Check uniqueness
  const [emailExists, phoneExists] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findFirst({ where: { phone }, select: { id: true } }),
  ]);
  if (emailExists) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  if (phoneExists) return NextResponse.json({ error: 'An account with this phone number already exists.' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role, language },
  });

  // Create role-specific sub-profile
  if (role === 'LANDLORD') {
    await prisma.landlordProfile.create({ data: { userId: user.id } });
  } else {
    await prisma.profile.create({ data: { userId: user.id } });
  }

  // Welcome notification
  const welcomeMsg = role === 'TENANT'
    ? { title: 'Welcome to LocaStay!', message: 'Start exploring properties and book your perfect home.', link: '/properties' }
    : { title: 'Welcome to LocaStay!', message: 'List your first property to start receiving verified tenant leads.', link: '/landlord/properties' };

  await prisma.notification.create({
    data: { userId: user.id, type: 'SYSTEM', ...welcomeMsg },
  });

  return NextResponse.json({ ok: true, email, role }, { status: 201 });
}
