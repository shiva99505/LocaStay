/**
 * Supabase-backed data access helpers.
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Featured properties — cached 60 s across requests (homepage, public listings)
// ─────────────────────────────────────────────────────────────────────────────
const _rawFeatured = unstable_cache(
  async () => {
    const admin = getAdminClient();
    const { data } = await admin
      .from('properties')
      .select('id, title, type, rent, city, state, village, cover_image, images, rating, review_count, is_verified, is_featured, total_rooms, occupied_rooms, latitude, longitude, distance_to_school, distance_to_hospital, distance_to_market, distance_to_bus_stand, distance_to_college, distance_to_railway, distance_to_atm, created_at')
      .in('status', ['AVAILABLE', 'OCCUPIED'])
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);
    return data ?? [];
  },
  ['featured-properties'],
  { revalidate: 60, tags: ['featured-properties'] },
);

export const getFeaturedProperties = cache(async () => {
  const data = await _rawFeatured();
  return data.map(p => ({
    ...p,
    coverImage:          p.cover_image,
    reviewCount:         p.review_count,
    isVerified:          p.is_verified,
    isFeatured:          p.is_featured,
    totalRooms:          p.total_rooms,
    occupiedRooms:       p.occupied_rooms,
    distanceToSchool:    p.distance_to_school,
    distanceToHospital:  p.distance_to_hospital,
    distanceToMarket:    p.distance_to_market,
    distanceToBusStand:  p.distance_to_bus_stand,
    distanceToCollege:   p.distance_to_college,
    distanceToRailway:   p.distance_to_railway,
    distanceToATM:       p.distance_to_atm,
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Single property detail — cached 30 s, separate queries (no brittle joins)
// ─────────────────────────────────────────────────────────────────────────────
const _rawPropertyById = unstable_cache(
  async (id: string) => {
    const admin = getAdminClient();
    const [{ data: rawProperty }, { data: rawReviews }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin.from('properties').select('*').eq('id', id).single() as any,
      admin.from('reviews')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('id, rating, comment, landlord_reply, created_at, tenant:profiles!tenant_id(name, avatar)').eq('property_id', id).order('created_at', { ascending: false }).limit(10) as any,
    ]);
    if (!rawProperty) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lp: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lpUser: any = null;
    if (rawProperty.landlord_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lpRow } = await (admin as any).from('landlord_profiles').select('id, response_rate, user_id').eq('id', rawProperty.landlord_id).maybeSingle();
      lp = lpRow;
      if (lpRow?.user_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userRow } = await (admin as any).from('profiles').select('name, phone, avatar, is_verified, created_at').eq('id', lpRow.user_id).maybeSingle();
        lpUser = userRow;
      }
    }
    return { rawProperty, rawReviews: rawReviews ?? [], lp, lpUser };
  },
  ['property-by-id'],
  { revalidate: 30, tags: ['property-by-id'] },
);

export const getPropertyById = cache(async (id: string) => {
  try {
    const result = await _rawPropertyById(id);
    if (!result) return null;
    const { rawProperty, rawReviews, lp, lpUser } = result;
    return {
      ...rawProperty,
      coverImage:         rawProperty.cover_image         as string | null,
      totalRooms:         rawProperty.total_rooms         as number,
      occupiedRooms:      rawProperty.occupied_rooms      as number,
      squareFeet:         rawProperty.square_feet         as number | null,
      availableFrom:      rawProperty.available_from      as string | null,
      isVerified:         rawProperty.is_verified         as boolean,
      isFeatured:         rawProperty.is_featured         as boolean,
      distanceToSchool:   rawProperty.distance_to_school  as number | null,
      distanceToHospital: rawProperty.distance_to_hospital as number | null,
      distanceToMarket:   rawProperty.distance_to_market  as number | null,
      distanceToBusStand: rawProperty.distance_to_bus_stand as number | null,
      distanceToRailway:  rawProperty.distance_to_railway as number | null,
      distanceToATM:      rawProperty.distance_to_atm     as number | null,
      images:             (rawProperty.images ?? [])       as string[],
      amenities:          [] as { key: string; label: string }[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reviews: (rawReviews as any[]).map((r: any) => ({
        id: r.id as string, rating: r.rating as number,
        comment: r.comment as string | null, landlordReply: r.landlord_reply as string | null,
        createdAt: r.created_at as string,
        tenant: {
          name:   (Array.isArray(r.tenant) ? r.tenant[0]?.name   : r.tenant?.name)   as string | null,
          avatar: (Array.isArray(r.tenant) ? r.tenant[0]?.avatar : r.tenant?.avatar) as string | null,
        },
      })),
      landlord: {
        responseRate: (lp?.response_rate ?? null) as number | null,
        user: {
          name:       (lpUser?.name        ?? null) as string | null,
          phone:      (lpUser?.phone       ?? null) as string | null,
          avatar:     (lpUser?.avatar      ?? null) as string | null,
          isVerified: (lpUser?.is_verified ?? false) as boolean,
          createdAt:  (lpUser?.created_at  ?? '')   as string,
        },
      },
    };
  } catch { return null; }
});

// ─────────────────────────────────────────────────────────────────────────────
// Properties listing with count — cached 30 s
// ─────────────────────────────────────────────────────────────────────────────
export const getPropertiesWithCount = cache(async (params: {
  page: number;
  pageSize: number;
  where: Record<string, unknown>;
}) => {
  const { page, pageSize, where } = params;
  const admin = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin.from('properties')
    .select('*', { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = where as any;
  if (Array.isArray(w.status?.in)) query = query.in('status', w.status.in);
  else if (w.status)               query = query.eq('status', w.status);
  if (w.type)                      query = query.eq('type', w.type);
  if (w.state?.contains)           query = query.ilike('state', `%${w.state.contains}%`);
  else if (w.state)                query = query.eq('state', w.state);
  if (w.city)                      query = query.ilike('city', `%${w.city}%`);
  if (w.isVerified === true)       query = query.eq('is_verified', true);
  if (w.rent?.gte != null)         query = query.gte('rent', w.rent.gte);
  if (w.rent?.lte != null)         query = query.lte('rent', w.rent.lte);
  if (w.OR) {
    query = query.or(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w.OR as Array<Record<string, any>>).map((cond) => {
        const [col, val] = Object.entries(cond)[0];
        return `${col}.ilike.%${(val as { contains: string }).contains}%`;
      }).join(','),
    );
  }

  const { data, count } = await query;
  return {
    total: count ?? 0,
    properties: (data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      coverImage:         p.cover_image,
      reviewCount:        p.review_count,
      isVerified:         p.is_verified,
      isFeatured:         p.is_featured,
      totalRooms:         p.total_rooms,
      occupiedRooms:      p.occupied_rooms,
      distanceToSchool:   p.distance_to_school,
      distanceToMarket:   p.distance_to_market,
      distanceToBusStand: p.distance_to_bus_stand,
    })),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Misc helpers
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadNotificationsCount = cache(async (userId: string) => {
  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any).from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  return count ?? 0;
});

// Admin counts — cached 60 s (no need for live counts on admin dashboard)
const _rawAdminCounts = unstable_cache(
  async () => {
    const admin = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = admin as any;
    const [
      { count: totalUsers }, { count: totalTenants }, { count: totalLandlords },
      { count: totalProperties }, { count: pendingProperties }, { count: activeBookings },
    ] = await Promise.all([
      a.from('profiles').select('*', { count: 'exact', head: true }),
      a.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TENANT'),
      a.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'LANDLORD'),
      a.from('properties').select('*', { count: 'exact', head: true }),
      a.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      a.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
    ]);
    return { totalUsers: totalUsers ?? 0, totalTenants: totalTenants ?? 0, totalLandlords: totalLandlords ?? 0, totalProperties: totalProperties ?? 0, pendingProperties: pendingProperties ?? 0, pendingKyc: 0, activeBookings: activeBookings ?? 0 };
  },
  ['admin-counts'],
  { revalidate: 60, tags: ['admin-counts'] },
);

export const getAdminCounts = cache(_rawAdminCounts);
