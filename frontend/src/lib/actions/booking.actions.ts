'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// ── create booking request ────────────────────────────────────────────────────

export async function createBooking(input: {
  propertyId: string;
  moveInDate: string;
  durationMonths: number;
  message?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please log in to request a booking' };

  const admin = getAdminClient();

  // Check if property exists and is available
  const { data: property } = await admin
    .from('properties')
    .select('id, status, title')
    .eq('id', input.propertyId)
    .single();

  if (!property) return { error: 'Property not found' };
  if (!['AVAILABLE', 'OCCUPIED'].includes(property.status)) {
    return { error: 'This property is not accepting bookings right now' };
  }

  // Check if tenant already has a pending/approved booking for this property
  const { data: existing } = await admin
    .from('bookings')
    .select('id, status')
    .eq('tenant_id', user.id)
    .eq('property_id', input.propertyId)
    .in('status', ['PENDING', 'APPROVED'])
    .maybeSingle();

  if (existing) {
    return { error: existing.status === 'APPROVED' ? 'You already have an approved booking for this property' : 'You already have a pending booking request for this property' };
  }

  const { data: booking, error } = await admin
    .from('bookings')
    .insert({
      tenant_id:       user.id,
      property_id:     input.propertyId,
      move_in_date:    input.moveInDate,
      duration_months: input.durationMonths,
      message:         input.message ?? null,
      status:          'PENDING' as never,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Create notification for landlord
  const { data: lp } = await admin
    .from('landlord_profiles')
    .select('user_id')
    .eq('id', (await admin.from('properties').select('landlord_id').eq('id', input.propertyId).single()).data?.landlord_id ?? '')
    .single();

  if (lp?.user_id) {
    try {
      await admin.from('notifications').insert({
        user_id: lp.user_id,
        title:   'New Booking Request',
        message: `A tenant has requested to book "${property.title}"`,
        type:    'BOOKING' as never,
        link:    '/landlord/tenants',
      });
    } catch { /* non-critical */ }
  }

  revalidatePath(`/properties/${input.propertyId}`);
  revalidatePath('/tenant/stay');
  return { success: true as const, bookingId: booking.id };
}

// ── toggle save property ──────────────────────────────────────────────────────

export async function toggleSaveProperty(propertyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please log in to save properties' };

  const admin = getAdminClient();

  const { data: existing } = await admin
    .from('saved_properties')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (existing) {
    await admin.from('saved_properties').delete().eq('id', existing.id);
    revalidatePath('/tenant/saved');
    return { saved: false };
  }

  await admin.from('saved_properties').insert({ user_id: user.id, property_id: propertyId });
  revalidatePath('/tenant/saved');
  return { saved: true };
}

// ── check if a property is saved ──────────────────────────────────────────────

export async function getIsSaved(propertyId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = getAdminClient();
  const { data } = await admin
    .from('saved_properties')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .maybeSingle();

  return !!data;
}
