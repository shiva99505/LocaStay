/**
 * Server-side auth helpers for Route Handlers and Server Actions.
 * These are thin wrappers around createServerClient so every route
 * doesn't have to repeat the same auth check boilerplate.
 */
import { NextResponse } from 'next/server';
import { createClient } from './server';
import type { UserRole } from './database.types';

export interface SessionUser {
  id:         string;
  email:      string;
  name:       string;
  role:       UserRole;
  phone:      string | null;
  avatar:     string | null;
  isVerified: boolean;
}

type AuthResult = {
  user:  SessionUser;
  error: null;
} | {
  user:  null;
  error: NextResponse;
};

/**
 * Require a signed-in user. Returns { user } or { error: 401 Response }.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      user:  null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, phone, avatar, is_verified, is_suspended')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return {
      user:  null,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 401 }),
    };
  }

  if (profile.is_suspended) {
    return {
      user:  null,
      error: NextResponse.json({ error: 'Account suspended' }, { status: 403 }),
    };
  }

  return {
    user: {
      id:         profile.id,
      email:      profile.email,
      name:       profile.name,
      role:       profile.role as UserRole,
      phone:      profile.phone,
      avatar:     profile.avatar,
      isVerified: profile.is_verified,
    },
    error: null,
  };
}

/**
 * Require a specific role. Returns { user } or an error Response.
 */
export async function requireRole(role: UserRole): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;

  if (result.user.role !== role) {
    return {
      user:  null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return result;
}

/**
 * Require admin role.
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole('ADMIN');
}
