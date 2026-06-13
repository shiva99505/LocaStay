'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@/lib/auth';

export interface AgreementInput {
  propertyId:    string;
  bookingId?:    string;
  tenantId:      string;
  rentAmount:    number;
  depositAmount: number;
  startDate:     string;
  endDate?:      string;
  clauses?:      string;
}

export async function createAgreement(input: AgreementInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') return { error: 'Unauthorized' };

  const admin = getAdminClient();
  const supabase = await createClient();

  const { data: lp } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!lp) return { error: 'Landlord profile not found' };

  // Verify landlord owns the property
  const { data: prop } = await admin
    .from('properties')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('id, title').eq('id', input.propertyId as any).eq('landlord_id', lp.id as any).maybeSingle();
  if (!prop) return { error: 'Property not found or not yours' };

  const { data: agreement, error } = await admin
    .from('agreements')
    .insert({
      landlord_id:    lp.id,
      tenant_id:      input.tenantId,
      property_id:    input.propertyId,
      booking_id:     input.bookingId ?? null,
      rent_amount:    input.rentAmount,
      deposit_amount: input.depositAmount,
      start_date:     input.startDate,
      end_date:       input.endDate ?? null,
      status:         'DRAFT' as never,
    } as never)
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Notify tenant
  await admin.from('notifications').insert({
    user_id: input.tenantId,
    type:    'AGREEMENT' as never,
    title:   'Rental Agreement Ready',
    message: `Your rental agreement for "${prop.title}" is ready to sign.`,
    link:    '/tenant/agreements',
  } as never).then(() => null, () => null);

  revalidatePath('/landlord/agreements');
  revalidatePath('/tenant/agreements');
  return { success: true as const, agreementId: agreement.id };
}

export async function signAgreement(agreementId: string, role: 'LANDLORD' | 'TENANT') {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const admin = getAdminClient();
  const now = new Date().toISOString();

  const field = role === 'LANDLORD' ? 'landlord_signed_at' : 'tenant_signed_at';

  const { error } = await admin
    .from('agreements')
    .update({ [field]: now, status: 'ACTIVE' as never } as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('id', agreementId as any);

  if (error) return { error: error.message };

  revalidatePath('/landlord/agreements');
  revalidatePath('/tenant/agreements');
  return { success: true as const };
}

export async function getLandlordApprovedBookings() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') return [];

  const supabase = await createClient();
  const { data: lp } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!lp) return [];

  const admin = getAdminClient();
  const { data: properties } = await admin
    .from('properties')
    .select('id')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('landlord_id', lp.id as any);
  const propIds = (properties ?? []).map(p => p.id);
  if (!propIds.length) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookings } = await (admin as any)
    .from('bookings')
    .select('id, move_in_date, duration_months, tenant_id, property_id, property:properties!property_id(id, title, rent, deposit, city, state), tenant:profiles!tenant_id(id, name, phone)')
    .in('property_id', propIds)
    .eq('status', 'APPROVED')
    .order('requested_at', { ascending: false });

  return (bookings ?? []) as Array<{
    id: string;
    move_in_date: string;
    duration_months: number;
    tenant_id: string;
    property_id: string;
    property: { id: string; title: string; rent: number; deposit: number; city: string; state: string };
    tenant: { id: string; name: string | null; phone: string | null };
  }>;
}
