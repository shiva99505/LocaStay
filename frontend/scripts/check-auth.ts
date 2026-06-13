import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  // 1. List auth users
  const { data: { users } } = await admin.auth.admin.listUsers();
  const demoEmails = ['aarav.mehta@locastay.in', 'ramesh.yadav@locastay.in', 'admin@locastay.in'];
  const demoUsers = users.filter(u => demoEmails.includes(u.email ?? ''));

  console.log('\n=== Auth Users ===');
  for (const u of demoUsers) {
    console.log(`  ${u.email}  id=${u.id}  confirmed=${!!u.email_confirmed_at}  meta=${JSON.stringify(u.user_metadata)}`);
  }

  // 2. Check profiles table
  const { data: profiles, error: profileErr } = await admin
    .from('profiles')
    .select('id, email, name, role, is_suspended')
    .in('email', demoEmails);

  console.log('\n=== Profiles ===');
  if (profileErr) {
    console.log('  ERROR:', profileErr.message);
  } else if (!profiles?.length) {
    console.log('  !! NO PROFILES FOUND — trigger did not run or failed silently');
  } else {
    for (const p of profiles) console.log(`  ${p.email}  role=${p.role}  suspended=${p.is_suspended}`);
  }

  // 3. Check if IDs match
  console.log('\n=== ID Match (auth.user.id == profile.id) ===');
  for (const u of demoUsers) {
    const p = profiles?.find(pr => pr.id === u.id);
    console.log(`  ${u.email}: ${p ? `✓ profile exists (role=${p.role})` : '✗ NO PROFILE'}`);
  }
}

check().catch(console.error);
