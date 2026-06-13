import { NextRequest, NextResponse } from 'next/server';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (admin as any)
    .from('bookings')
    .select('id, status, tenant_id, property_id, move_in_date, duration_months, property:properties!property_id(id, title, rent, deposit, landlord_id, landlord_profiles!landlord_id(id, user_id))')
    .eq('id', id)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.status !== 'PENDING') return NextResponse.json({ error: 'Booking is no longer pending' }, { status: 409 });

  // Verify requester is the landlord
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prop = booking.property as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lp = Array.isArray(prop?.landlord_profiles) ? prop.landlord_profiles[0] : prop?.landlord_profiles as any;
  if (!lp || lp.user_id !== user.id) {
    // Also allow admin role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const newStatus = isApprove ? 'APPROVED' : 'REJECTED';

  // Update booking status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('bookings')
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq('id', id);

  if (isApprove) {
    // Increment occupied_rooms on property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: propData } = await (admin as any)
      .from('properties').select('occupied_rooms, total_rooms').eq('id', booking.property_id).single();
    const newOccupied = Math.min((propData?.occupied_rooms ?? 0) + 1, propData?.total_rooms ?? 999);
    const newPropStatus = newOccupied >= (propData?.total_rooms ?? 1) ? 'OCCUPIED' : 'AVAILABLE';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('properties')
      .update({ occupied_rooms: newOccupied, status: newPropStatus })
      .eq('id', booking.property_id);

    // Calculate end date from duration
    let endDate: string | null = null;
    if (booking.duration_months && booking.move_in_date) {
      const d = new Date(booking.move_in_date);
      d.setMonth(d.getMonth() + booking.duration_months);
      endDate = d.toISOString().split('T')[0];
    }

    // Auto-create agreement in Supabase
    const existingAgreement = await (admin as any)
      .from('agreements')
      .select('id')
      .eq('booking_id', id)
      .maybeSingle();

    if (!existingAgreement?.data) {
      await (admin as any).from('agreements').insert({
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

    // Notify tenant — agreement ready
    await (admin as any).from('notifications').insert({
      user_id: booking.tenant_id,
      type:    'AGREEMENT',
      title:   'Booking Approved — Agreement Ready',
      message: `Your booking for "${prop?.title ?? 'the property'}" was approved. Your rental agreement is ready to sign.`,
      link:    '/tenant/agreements',
    }).catch(() => null);
  } else {
    // Notify tenant — rejected
    await (admin as any).from('notifications').insert({
      user_id: booking.tenant_id,
      type:    'BOOKING',
      title:   'Booking Rejected',
      message: `Your booking for "${prop?.title ?? 'the property'}" was not approved.${body.reason ? ` Reason: ${body.reason}` : ''}`,
      link:    '/properties',
    }).catch(() => null);
  }

  return NextResponse.json({ success: true, status: newStatus });
}
