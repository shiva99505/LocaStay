'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// ── helpers ──────────────────────────────────────────────────────────────────

async function getLandlordId(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (data) return data.id;

  // Auto-create if missing (new landlord who registered normally)
  const { data: created } = await admin
    .from('landlord_profiles')
    .insert({ user_id: userId })
    .select('id')
    .single();
  return created?.id ?? null;
}

async function upsertAmenities(propertyId: string, labels: string[]) {
  if (!labels.length) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as unknown as { from: (t: string) => any };

  for (const label of labels) {
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const { data: amenity } = await db
      .from('amenities')
      .upsert({ key, label }, { onConflict: 'key' })
      .select('id')
      .single() as { data: { id: string } | null };

    if (amenity?.id) {
      await db
        .from('property_amenities')
        .upsert({ property_id: propertyId, amenity_id: amenity.id });
    }
  }
}

// ── create property ───────────────────────────────────────────────────────────

export interface CreatePropertyInput {
  title: string;
  type: string;
  description?: string;
  rent: number;
  deposit: number;
  totalRooms: number;
  squareFeet?: number;
  availableFrom: string;
  address: string;
  village?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  coverImage?: string;
  distanceToSchool?: number;
  distanceToHospital?: number;
  distanceToMarket?: number;
  distanceToBusStand?: number;
  distanceToRailway?: number;
  distanceToATM?: number;
  distanceToCollege?: number;
}

export async function createProperty(input: CreatePropertyInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const landlordId = await getLandlordId(user.id);
  if (!landlordId) return { error: 'Landlord profile not found' };

  const admin = getAdminClient();
  const { data: property, error } = await admin
    .from('properties')
    .insert({
      landlord_id:    landlordId,
      title:          input.title,
      type:           input.type as never,
      description:    input.description ?? null,
      rent:           input.rent,
      deposit:        input.deposit,
      total_rooms:    input.totalRooms,
      occupied_rooms: 0,
      available_from: input.availableFrom,
      address:        input.address,
      village:        input.village ?? null,
      city:           input.city,
      state:          input.state,
      pincode:        input.pincode,
      latitude:              input.latitude,
      longitude:             input.longitude,
      cover_image:           input.coverImage ?? null,
      square_feet:           input.squareFeet ?? null,
      distance_to_school:    input.distanceToSchool    ?? null,
      distance_to_hospital:  input.distanceToHospital  ?? null,
      distance_to_market:    input.distanceToMarket    ?? null,
      distance_to_bus_stand: input.distanceToBusStand  ?? null,
      distance_to_railway:   input.distanceToRailway   ?? null,
      distance_to_atm:       input.distanceToATM       ?? null,
      distance_to_college:   input.distanceToCollege   ?? null,
      status:                'PENDING' as never,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await upsertAmenities(property.id, input.amenities);

  revalidatePath('/landlord/properties');
  return { success: true as const, propertyId: property.id };
}

// ── admin: approve ────────────────────────────────────────────────────────────

export async function approveProperty(propertyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = getAdminClient();
  const { error } = await admin
    .from('properties')
    .update({ status: 'AVAILABLE' as never, published_at: new Date().toISOString() })
    .eq('id', propertyId);

  if (error) return { error: error.message };

  revalidatePath('/admin/properties');
  revalidatePath('/properties');
  revalidatePath('/tenant');
  return { success: true as const };
}

// ── admin: reject ─────────────────────────────────────────────────────────────

export async function rejectProperty(propertyId: string, reason?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = getAdminClient();
  const { error } = await admin
    .from('properties')
    .update({
      status:           'REJECTED' as never,
      rejection_reason: reason ?? null,
    })
    .eq('id', propertyId);

  if (error) return { error: error.message };

  revalidatePath('/admin/properties');
  return { success: true as const };
}

// ── admin: delete (hard remove) ───────────────────────────────────────────────

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = getAdminClient();
  const { error } = await admin
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (error) return { error: error.message };

  revalidatePath('/admin/properties');
  revalidatePath('/properties');
  revalidatePath('/tenant');
  revalidatePath('/landlord/properties');
  return { success: true as const };
}

// ── upload cover image ────────────────────────────────────────────────────────

export async function uploadCoverImage(formData: FormData) {
  const file = formData.get('file') as File | null;
  if (!file || !file.size) return { error: 'No file provided' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = getAdminClient();
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `properties/${user.id}/${Date.now()}.${ext}`;

  // Ensure bucket exists
  await admin.storage.createBucket('property-images', { public: true }).catch(() => null);

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadErr } = await admin.storage
    .from('property-images')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadErr) return { error: uploadErr.message };

  const { data: { publicUrl } } = admin.storage.from('property-images').getPublicUrl(path);
  return { url: publicUrl };
}
