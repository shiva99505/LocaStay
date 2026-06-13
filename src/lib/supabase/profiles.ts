// @ts-nocheck
/**
 * Profile & LandlordProfile CRUD helpers.
 * Call these from Server Components / Route Handlers — they use the
 * server client so RLS runs as the authenticated user.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile, LandlordProfile } from './database.types';

type DB = SupabaseClient<Database>;

// ─── Tenant Profile ────────────────────────────────────────────────────────────

/** Fetch the profile for a given user ID (or the signed-in user if omitted). */
export async function getProfile(db: DB, userId: string): Promise<Profile | null> {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`getProfile: ${error.message}`);
  }
  return data;
}

/** Upsert profile fields (name, phone, avatar, etc.). */
export async function upsertProfile(
  db: DB,
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>>,
): Promise<Profile> {
  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`upsertProfile: ${error.message}`);
  return data;
}

/** Suspend / unsuspend a user (admin-only — use admin client). */
export async function setUserSuspended(
  db: DB,
  userId: string,
  suspended: boolean,
): Promise<void> {
  const { error } = await db
    .from('profiles')
    .update({ is_suspended: suspended })
    .eq('id', userId);

  if (error) throw new Error(`setUserSuspended: ${error.message}`);
}

/** Paginated admin user list. */
export async function listUsers(
  db: DB,
  opts: { role?: Profile['role']; page?: number; pageSize?: number } = {},
): Promise<{ data: Profile[]; count: number }> {
  const { role, page = 1, pageSize = 20 } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = db
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (role) query = query.eq('role', role);

  const { data, error, count } = await query;
  if (error) throw new Error(`listUsers: ${error.message}`);
  return { data: data ?? [], count: count ?? 0 };
}

// ─── Landlord Profile ──────────────────────────────────────────────────────────

/** Fetch landlord profile by user ID. */
export async function getLandlordProfile(db: DB, userId: string): Promise<LandlordProfile | null> {
  const { data, error } = await db
    .from('landlord_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`getLandlordProfile: ${error.message}`);
  }
  return data;
}

/** Create a landlord profile (called once when user upgrades to LANDLORD role). */
export async function createLandlordProfile(
  db: DB,
  userId: string,
  data: Partial<Omit<LandlordProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<LandlordProfile> {
  const { data: profile, error } = await db
    .from('landlord_profiles')
    .insert({ user_id: userId, ...data })
    .select()
    .single();

  if (error) throw new Error(`createLandlordProfile: ${error.message}`);
  return profile;
}

/** Update landlord-specific fields (banking, bio, etc.). */
export async function updateLandlordProfile(
  db: DB,
  userId: string,
  updates: Partial<Omit<LandlordProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<LandlordProfile> {
  const { data, error } = await db
    .from('landlord_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`updateLandlordProfile: ${error.message}`);
  return data;
}

/** Upsert (create if missing, update if present). */
export async function upsertLandlordProfile(
  db: DB,
  userId: string,
  fields: Partial<Omit<LandlordProfile, 'id' | 'created_at' | 'updated_at'>>,
): Promise<LandlordProfile> {
  const { data, error } = await db
    .from('landlord_profiles')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`upsertLandlordProfile: ${error.message}`);
  return data;
}
