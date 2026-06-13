/**
 * POST /api/auth/register
 * Creates a new Supabase auth user + profile row.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/supabase/database.types';

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
  const admin = getAdminClient();

  // Check phone uniqueness (Supabase Auth only de-dupes email)
  const { data: phoneExists } = await admin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (phoneExists) {
    return NextResponse.json({ error: 'An account with this phone number already exists.' }, { status: 409 });
  }

  // Create Supabase auth user
  const { data: authData, error: signUpError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // skip email confirmation for dev; set false + enable OTP in prod
    user_metadata: { name, role, phone, language },
  });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('already registered')) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // The handle_new_user trigger auto-creates a basic profile row.
  // Update it with the full signup data:
  const { error: profileError } = await admin
    .from('profiles')
    .update({ name, phone, role: role as UserRole, language })
    .eq('id', userId);

  if (profileError) {
    console.error('register: profile update failed', profileError);
  }

  // Create role-specific sub-profile
  if (role === 'LANDLORD') {
    await admin.from('landlord_profiles').insert({ user_id: userId });
  }

  // Welcome notification
  const welcomeMsg =
    role === 'TENANT'
      ? { title: 'Welcome to LocaStay!', message: 'Complete your KYC to unlock instant booking approvals.', link: '/tenant/profile' }
      : { title: 'Welcome to LocaStay!', message: 'List your first property to start receiving verified tenant leads.', link: '/landlord/properties' };

  await admin.from('notifications').insert({
    user_id: userId,
    type:    'SYSTEM',
    ...welcomeMsg,
  });

  return NextResponse.json({ ok: true, email, role }, { status: 201 });
}
