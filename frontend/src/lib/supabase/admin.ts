import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

let _admin: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
    _admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  }
  return _admin;
}
