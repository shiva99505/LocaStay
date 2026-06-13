/**
 * Server-side Supabase client (Next.js App Router).
 * Import this in Server Components, Route Handlers, and Server Actions.
 * Reads the session cookie so RLS runs as the authenticated user.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Route Handlers / Server Components that don't support cookie writes
            // will silently skip — the middleware will refresh the session instead.
          }
        },
      },
    },
  );
}
