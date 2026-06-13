// @ts-nocheck
/**
 * Review CRUD helpers.
 * RLS enforces: only tenants with an APPROVED booking can submit a review.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Review } from './database.types';

type DB = SupabaseClient<Database>;

/** Fetch all reviews for a property, newest first. */
export async function getPropertyReviews(
  db: DB,
  propertyId: string,
): Promise<(Review & { reviewer: { name: string; avatar: string | null } })[]> {
  const { data, error } = await db
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!tenant_id(name, avatar)
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getPropertyReviews: ${error.message}`);
  return (data ?? []) as unknown as (Review & { reviewer: { name: string; avatar: string | null } })[];
}

/** Tenant submits a review (RLS blocks if no approved booking). */
export async function createReview(
  db: DB,
  input: {
    propertyId: string;
    tenantId:   string;
    rating:     number;
    comment?:   string;
    images?:    string[];
  },
): Promise<Review> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }

  // Prevent duplicate reviews
  const { data: existing } = await db
    .from('reviews')
    .select('id')
    .eq('property_id', input.propertyId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle();

  if (existing) throw new Error('You have already reviewed this property.');

  const { data, error } = await db
    .from('reviews')
    .insert({
      property_id: input.propertyId,
      tenant_id:   input.tenantId,
      rating:      input.rating,
      comment:     input.comment,
      images:      input.images ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(`createReview: ${error.message}`);
  return data;
}

/** Tenant updates their own review. */
export async function updateReview(
  db: DB,
  id: string,
  tenantId: string,
  updates: { rating?: number; comment?: string; images?: string[] },
): Promise<Review> {
  if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
    throw new Error('Rating must be between 1 and 5.');
  }

  const { data, error } = await db
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw new Error(`updateReview: ${error.message}`);
  return data;
}

/** Landlord adds a reply to a review. */
export async function addLandlordReply(
  db: DB,
  reviewId: string,
  reply: string,
): Promise<Review> {
  const { data, error } = await db
    .from('reviews')
    .update({ landlord_reply: reply.trim() })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw new Error(`addLandlordReply: ${error.message}`);
  return data;
}

/** Delete a review (admin only — use admin client). */
export async function deleteReview(db: DB, id: string): Promise<void> {
  const { error } = await db.from('reviews').delete().eq('id', id);
  if (error) throw new Error(`deleteReview: ${error.message}`);
}
