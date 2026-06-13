// @ts-nocheck
/**
 * Property CRUD + search helpers.
 * All writes are guarded by RLS; the server client runs as the signed-in user.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Property, PropertyStatus, PropertyType } from './database.types';

type DB = SupabaseClient<Database>;

export interface PropertyFilters {
  city?: string;
  state?: string;
  type?: PropertyType;
  minRent?: number;
  maxRent?: number;
  minRooms?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  search?: string;           // full-text search term
  landlordId?: string;
  status?: PropertyStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'rent' | 'rating' | 'created_at' | 'views';
  sortDir?: 'asc' | 'desc';
}

// ─── Public reads ──────────────────────────────────────────────────────────────

/** Paginated property listing with filters. */
export async function listProperties(
  db: DB,
  filters: PropertyFilters = {},
): Promise<{ data: Property[]; count: number }> {
  const {
    city, state, type, minRent, maxRent, minRooms,
    isVerified, isFeatured, search, landlordId,
    status = 'AVAILABLE',
    page = 1, pageSize = 20,
    sortBy = 'created_at', sortDir = 'desc',
  } = filters;

  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = db
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range(from, to);

  if (city)        query = query.ilike('city', `%${city}%`);
  if (state)       query = query.ilike('state', `%${state}%`);
  if (type)        query = query.eq('type', type);
  if (minRent)     query = query.gte('rent', minRent);
  if (maxRent)     query = query.lte('rent', maxRent);
  if (minRooms)    query = query.gte('total_rooms', minRooms);
  if (isVerified !== undefined) query = query.eq('is_verified', isVerified);
  if (isFeatured !== undefined) query = query.eq('is_featured', isFeatured);
  if (landlordId)  query = query.eq('landlord_id', landlordId);

  // Full-text search (pg_trgm index)
  if (search) {
    query = query.textSearch('title', search, { type: 'websearch', config: 'english' });
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`listProperties: ${error.message}`);
  return { data: data ?? [], count: count ?? 0 };
}

/** Find properties within a radius (km) using Haversine approximation. */
export async function listPropertiesNearby(
  db: DB,
  lat: number,
  lng: number,
  radiusKm = 10,
  pageSize = 20,
): Promise<Property[]> {
  // Using bounding-box pre-filter for performance, then exact Haversine client-side
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const { data, error } = await db
    .from('properties')
    .select('*')
    .eq('status', 'AVAILABLE')
    .gte('latitude',  lat - latDelta)
    .lte('latitude',  lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta)
    .order('rating', { ascending: false })
    .limit(pageSize * 2); // oversample then filter

  if (error) throw new Error(`listPropertiesNearby: ${error.message}`);

  const haversine = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371;
    const dLat = ((la2 - la1) * Math.PI) / 180;
    const dLon = ((lo2 - lo1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((la1 * Math.PI) / 180) *
        Math.cos((la2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (data ?? [])
    .filter(p => haversine(lat, lng, p.latitude, p.longitude) <= radiusKm)
    .slice(0, pageSize);
}

/** Single property detail by ID. */
export async function getProperty(db: DB, id: string): Promise<Property | null> {
  const { data, error } = await db
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`getProperty: ${error.message}`);
  }
  return data;
}

/** Increment view counter (fire-and-forget). */
export async function incrementPropertyViews(db: DB, id: string): Promise<void> {
  await db.rpc('increment_property_views' as never, { prop_id: id } as never);
  // Fallback if RPC doesn't exist:
  // await db.from('properties').update({ views: property.views + 1 }).eq('id', id);
}

// ─── Landlord writes ──────────────────────────────────────────────────────────

export interface CreatePropertyInput {
  landlordId: string;
  title: string;
  description?: string;
  type: PropertyType;
  rent: number;
  deposit: number;
  address: string;
  village?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  squareFeet?: number;
  availableFrom?: string;
  totalRooms?: number;
  coverImage?: string;
  images?: string[];
  distanceToSchool?: number;
  distanceToHospital?: number;
  distanceToMarket?: number;
  distanceToBusStand?: number;
}

/** Create a new property listing (status starts as PENDING until admin approves). */
export async function createProperty(
  db: DB,
  input: CreatePropertyInput,
): Promise<Property> {
  const { data, error } = await db
    .from('properties')
    .insert({
      landlord_id:         input.landlordId,
      title:               input.title,
      description:         input.description,
      type:                input.type,
      rent:                input.rent,
      deposit:             input.deposit,
      address:             input.address,
      village:             input.village,
      city:                input.city,
      district:            input.district,
      state:               input.state,
      pincode:             input.pincode,
      latitude:            input.latitude,
      longitude:           input.longitude,
      square_feet:         input.squareFeet,
      available_from:      input.availableFrom,
      total_rooms:         input.totalRooms ?? 1,
      cover_image:         input.coverImage,
      images:              input.images ?? [],
      distance_to_school:  input.distanceToSchool,
      distance_to_hospital:input.distanceToHospital,
      distance_to_market:  input.distanceToMarket,
      distance_to_bus_stand: input.distanceToBusStand,
      status:              'PENDING',
    })
    .select()
    .single();

  if (error) throw new Error(`createProperty: ${error.message}`);
  return data;
}

/** Update an existing property listing. */
export async function updateProperty(
  db: DB,
  id: string,
  updates: Partial<Omit<Property, 'id' | 'landlord_id' | 'created_at' | 'updated_at'>>,
): Promise<Property> {
  const { data, error } = await db
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateProperty: ${error.message}`);
  return data;
}

/** Soft-delete: set status to DELISTED. */
export async function delistProperty(db: DB, id: string): Promise<void> {
  const { error } = await db
    .from('properties')
    .update({ status: 'DELISTED' })
    .eq('id', id);

  if (error) throw new Error(`delistProperty: ${error.message}`);
}

// ─── Admin writes ─────────────────────────────────────────────────────────────

/** Approve a property listing (admin only — use admin client). */
export async function approveProperty(db: DB, id: string): Promise<void> {
  const { error } = await db
    .from('properties')
    .update({
      status:       'AVAILABLE',
      is_verified:  true,
      published_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`approveProperty: ${error.message}`);
}

/** Reject a property listing with a reason (admin only). */
export async function rejectProperty(db: DB, id: string, reason: string): Promise<void> {
  const { error } = await db
    .from('properties')
    .update({ status: 'REJECTED', rejection_reason: reason })
    .eq('id', id);

  if (error) throw new Error(`rejectProperty: ${error.message}`);
}

// ─── Saved / wishlist ─────────────────────────────────────────────────────────

/** Toggle saved state; returns new state (true = now saved). */
export async function toggleSavedProperty(
  db: DB,
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { data: existing } = await db
    .from('saved_properties')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (existing) {
    await db
      .from('saved_properties')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    return false;
  }

  await db
    .from('saved_properties')
    .insert({ user_id: userId, property_id: propertyId });
  return true;
}

/** List all properties saved by a user. */
export async function getSavedProperties(db: DB, userId: string): Promise<Property[]> {
  const { data, error } = await db
    .from('saved_properties')
    .select('property_id, properties(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getSavedProperties: ${error.message}`);
  return (data ?? []).map(r => (r as { properties: Property }).properties).filter(Boolean);
}
