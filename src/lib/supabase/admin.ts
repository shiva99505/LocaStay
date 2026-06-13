/**
 * Service-role Supabase client — BYPASSES RLS.
 * NEVER import this in client-side code or expose the key to the browser.
 * Use exclusively in Edge Functions, trusted server actions, and admin API routes.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Module-level singleton so we don't create a new client on every call
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — never expose this in the browser.');
  }

  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}
