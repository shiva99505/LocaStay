/**
 * Creates demo accounts in Supabase Auth + profiles table (skips email confirmation).
 * Run once: npx tsx scripts/seed-demo-users.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually (no dotenv needed)
const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = 'Demo@1234';

const DEMO_USERS = [
  { email: 'aarav.mehta@locastay.in',  name: 'Aarav Mehta',    role: 'TENANT',   phone: '9876543210' },
  { email: 'ramesh.yadav@locastay.in', name: 'Ramesh Yadav',   role: 'LANDLORD', phone: '9876543211' },
  { email: 'admin@locastay.in',        name: 'LocaStay Admin', role: 'ADMIN',    phone: '9876543212' },
];

async function upsertProfile(userId: string, u: typeof DEMO_USERS[0]) {
  const { error } = await admin.from('profiles').upsert({
    id:       userId,
    email:    u.email,
    name:     u.name,
    role:     u.role,
    phone:    u.phone,
    language: 'en',
  }, { onConflict: 'id' });
  if (error) console.log(`  ⚠ Profile upsert failed: ${error.message}`);
  else console.log(`  ✓ Profile upserted`);

  if (u.role === 'LANDLORD') {
    const { error: lpErr } = await admin.from('landlord_profiles').upsert(
      { user_id: userId },
      { onConflict: 'user_id' },
    );
    if (lpErr) console.log(`  ⚠ landlord_profile upsert failed: ${lpErr.message}`);
    else console.log(`  ✓ landlord_profile upserted`);
  }
}

async function seed() {
  console.log('Seeding demo users...\n');

  const { data: allUsers } = await admin.auth.admin.listUsers();

  for (const u of DEMO_USERS) {
    const existing = allUsers?.users?.find((x) => x.email === u.email);

    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password:      DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: u.name, role: u.role, phone: u.phone, language: 'en' },
      });
      console.log(error ? `✗ Update failed: ${u.email} — ${error.message}` : `✓ Updated:  ${u.email}  (${u.role})`);
      await upsertProfile(existing.id, u);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email:         u.email,
        password:      DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: u.name, role: u.role, phone: u.phone, language: 'en' },
      });
      if (error) {
        console.log(`✗ Create failed: ${u.email} — ${error.message}`);
      } else {
        console.log(`✓ Created:  ${u.email}  (${u.role})  id=${data.user.id}`);
        await upsertProfile(data.user.id, u);
      }
    }
  }

  console.log(`\nAll done! Login with password: ${DEMO_PASSWORD}`);
}

seed().catch(console.error);
