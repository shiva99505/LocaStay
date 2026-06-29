import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = getAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { action?: string; reason?: string };
  const rawAction = body.action ?? '';
  // Accept both 'APPROVE' and 'APPROVED' for compatibility
  const isApprove = rawAction === 'APPROVE' || rawAction === 'APPROVED';
  const isReject  = rawAction === 'REJECT'  || rawAction === 'REJECTED';
  if (!isApprove && !isReject) {
    return NextResponse.json({ error: 'action must be APPROVED or REJECTED' }, { status: 400 });
  }

  // Fetch booking fields only — no FK joins to avoid PGRST200 crashes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (admin as any)
    .from('bookings')
    .select('id, status, tenant_id, property_id, move_in_date, duration_months')
    .eq('id', id)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.status !== 'PENDING') return NextResponse.json({ error: 'Booking is no longer pending' }, { status: 409 });

  // Fetch property separately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prop } = await (admin as any)
    .from('properties')
    .select('id, title, rent, deposit, landlord_id')
    .eq('id', booking.property_id)
    .single();

  // Fetch landlord profile separately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lp } = prop?.landlord_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (admin as any).from('landlord_profiles').select('id, user_id').eq('id', prop.landlord_id).single()
    : { data: null };

  // Verify requester is the landlord or admin
  if (!lp || lp.user_id !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const newStatus = isApprove ? 'APPROVED' : 'REJECTED';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any;

  await adminDb.from('bookings').update({ status: newStatus, responded_at: new Date().toISOString() }).eq('id', id);

  if (isApprove) {
    const { data: propData } = await adminDb.from('properties').select('occupied_rooms, total_rooms').eq('id', booking.property_id).single();
    const newOccupied = Math.min((propData?.occupied_rooms ?? 0) + 1, propData?.total_rooms ?? 999);
    const newPropStatus = newOccupied >= (propData?.total_rooms ?? 1) ? 'OCCUPIED' : 'AVAILABLE';
    await adminDb.from('properties').update({ occupied_rooms: newOccupied, status: newPropStatus }).eq('id', booking.property_id);

    // Calculate end date from duration
    let endDate: string | null = null;
    if (booking.duration_months && booking.move_in_date) {
      const d = new Date(booking.move_in_date);
      d.setMonth(d.getMonth() + booking.duration_months);
      endDate = d.toISOString().split('T')[0];
    }

    const existingAgreement = await adminDb.from('agreements').select('id').eq('booking_id', id).maybeSingle();

    if (!existingAgreement?.data) {
      await adminDb.from('agreements').insert({
        tenant_id:      booking.tenant_id,
        landlord_id:    lp?.id ?? prop?.landlord_id,
        property_id:    booking.property_id,
        booking_id:     id,
        rent_amount:    prop?.rent ?? 0,
        deposit_amount: prop?.deposit ?? 0,
        start_date:     booking.move_in_date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        end_date:       endDate,
        status:         'ACTIVE',
      });
    }

    // Rent tracker is NOT started automatically — landlord must set it up manually
    // via the "Setup Rent Tracker" option in the tenants page.

    await adminDb.from('notifications').insert({
      user_id: booking.tenant_id,
      type:    'AGREEMENT',
      title:   'Booking Approved — Agreement Ready',
      message: `Your booking for "${prop?.title ?? 'the property'}" was approved. Your rental agreement is ready to sign.`,
      link:    '/tenant/agreements',
    }).catch(() => null);
  } else {
    await adminDb.from('notifications').insert({
      user_id: booking.tenant_id,
      type:    'BOOKING',
      title:   'Booking Rejected',
      message: `Your booking for "${prop?.title ?? 'the property'}" was not approved.${body.reason ? ` Reason: ${body.reason}` : ''}`,
      link:    '/properties',
    }).catch(() => null);
  }

  revalidatePath('/landlord');
  revalidatePath('/landlord/tenants');
  revalidatePath('/tenant/stay');
  revalidatePath('/tenant/rent');
  revalidatePath(`/properties/${booking.property_id}`);

  return NextResponse.json({ success: true, status: newStatus });
}
