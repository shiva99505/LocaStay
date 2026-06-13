/**
 * Supabase-backed auth shim — SERVER ONLY (uses next/headers via server.ts).
 * Import constants/types from @/lib/auth-config in client components.
 */
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth-config';
export type { UserRole } from '@/lib/auth-config';
export { ROLE_HOME } from '@/lib/auth-config';

export interface SessionUser {
  id:         string;
  email:      string;
  name:       string | null;
  role:       UserRole;
  phone:      string | null;
  avatar:     string | null;
  isVerified: boolean;
  language:   string;
}

export interface Session {
  user: SessionUser;
}

export async function auth(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role, phone, avatar, is_verified, language, is_suspended')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) return null;

    // Fall back to JWT user_metadata if no profile row exists yet
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const rawRole = profile?.role ?? (meta?.role as string | undefined) ?? 'TENANT';
    const role = (['TENANT', 'LANDLORD', 'ADMIN'].includes(rawRole) ? rawRole : 'TENANT') as UserRole;

    return {
      user: {
        id:         user.id,
        email:      user.email ?? '',
        name:       profile?.name ?? (meta?.name as string | null) ?? null,
        role,
        phone:      profile?.phone ?? (meta?.phone as string | null) ?? null,
        avatar:     profile?.avatar ?? null,
        isVerified: profile?.is_verified ?? false,
        language:   (profile?.language ?? meta?.language as string | undefined) ?? 'en',
      },
    };
  } catch {
    return null;
  }
}
