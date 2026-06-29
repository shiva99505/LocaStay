import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/sms';

const GRACE_DAYS     = 5;   // days after due date before marking OVERDUE
const LATE_FEE_RATE  = 0.02; // 2% of monthly rent as late fee (min ₹200)

/** Clamp day to last valid day of the given month. */
function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * Find the first due date >= startDate.
 * e.g. startDate = Jun 15, dueDay = 1 → first due = Jul 1
 *      startDate = Jun 1,  dueDay = 1 → first due = Jun 1
 *      startDate = Jun 1,  dueDay = 5 → first due = Jun 5
 */
function firstDueDate(start: Date, dueDay: number): Date {
  const day = clampDay(start.getFullYear(), start.getMonth(), dueDay);
  const candidate = new Date(start.getFullYear(), start.getMonth(), day);
  if (candidate >= start) return candidate;
  // Due day already passed this month → first payment is next month
  const nm = start.getMonth() + 1;
  const ny = nm > 11 ? start.getFullYear() + 1 : start.getFullYear();
  const nm2 = nm % 12;
  return new Date(ny, nm2, clampDay(ny, nm2, dueDay));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    bookingId: string;
    propertyId: string;
    tenantId: string;
    tenantPhone?: string;
    tenantName?: string;
    propertyTitle?: string;
    startDate: string;      // 'YYYY-MM-DD' — move-in / lease start
    durationMonths: number;
    rentAmount: number;
    dueDay: number;         // 1-28
    graceDays?: number;     // override, default 5
    lateFeeAmount?: number; // override, default 2% of rent (min ₹200)
  };

  const {
    bookingId, propertyId, tenantId, tenantPhone, tenantName,
    propertyTitle, startDate, durationMonths, rentAmount, dueDay,
  } = body;

  if (!bookingId || !propertyId || !tenantId || !startDate || !durationMonths || !rentAmount || !dueDay) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any;

  const { data: prop } = await admin
    .from('properties').select('id, landlord_id').eq('id', propertyId).single();
  const { data: lp } = prop?.landlord_id
    ? await admin.from('landlord_profiles').select('id, user_id').eq('id', prop.landlord_id).single()
    : { data: null };

  if (!lp || lp.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Delete existing PENDING payments only (keep PAID / OVERDUE history)
  await admin.from('rent_payments').delete()
    .eq('booking_id', bookingId)
    .eq('status', 'PENDING');

  const graceDays    = body.graceDays    ?? GRACE_DAYS;
  const lateFee      = body.lateFeeAmount ?? Math.max(200, Math.round(rentAmount * LATE_FEE_RATE));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Calculate first due date (CRITICAL FIX) ──────────────────
  // Parse start date in local time (avoid UTC offset shifting day by 1)
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const firstDue = firstDueDate(start, dueDay);

  // ── Build payment schedule ────────────────────────────────────
  const payments: object[] = [];

  for (let i = 0; i < durationMonths; i++) {
    const dueYear  = firstDue.getFullYear();
    const dueMonth = firstDue.getMonth() + i;
    // Normalise: JS Date handles month overflow automatically (e.g. month 13 → Feb next year)
    const rawDue   = new Date(dueYear, dueMonth, clampDay(
      new Date(dueYear, dueMonth, 1).getFullYear(),
      new Date(dueYear, dueMonth, 1).getMonth(),
      dueDay,
    ));
    // Re-clamp for this specific month (month overflow can change the year/month)
    const finalDay = clampDay(rawDue.getFullYear(), rawDue.getMonth(), dueDay);
    const dueDate  = new Date(rawDue.getFullYear(), rawDue.getMonth(), finalDay);

    const graceDeadline = new Date(dueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

    // Period: human-readable "Jun 2026"
    const period = dueDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    // Status: OVERDUE if grace period already expired, else PENDING
    const status   = graceDeadline < today ? 'OVERDUE' : 'PENDING';
    const fee      = status === 'OVERDUE' ? lateFee : 0;

    payments.push({
      tenant_id:   tenantId,
      property_id: propertyId,
      booking_id:  bookingId,
      period,
      amount:      Math.round(rentAmount),
      late_fee:    fee,
      due_date:    dueDate.toISOString().split('T')[0],
      status,
    });
  }

  const { error: insertError } = await admin.from('rent_payments').insert(payments);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // ── endDate = last day of the month of the last payment ───────
  const lastPaymentDue = (payments[payments.length - 1] as { due_date: string }).due_date;
  const [ly, lm] = lastPaymentDue.split('-').map(Number);
  const endDate = new Date(ly, lm, 0).toISOString().split('T')[0]; // day 0 = last day of previous month

  // Update agreement: set start, end, rent, status
  await admin.from('agreements')
    .update({
      start_date:  startDate,
      end_date:    endDate,
      rent_amount: Math.round(rentAmount),
      status:      'ACTIVE',
    })
    .eq('booking_id', bookingId);

  // In-app notification for tenant
  const firstDueStr = firstDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  await admin.from('notifications').insert({
    user_id: tenantId,
    title:   'Rent Tracker Started',
    message: `"${propertyTitle ?? 'Your property'}" ka rent tracker setup ho gaya. ` +
             `${durationMonths} months, ₹${Math.round(rentAmount).toLocaleString('en-IN')}/month. ` +
             `Pehla payment due: ${firstDueStr}.`,
    link:    '/tenant/rent',
    is_read: false,
  }).catch(() => null);

  if (tenantPhone) {
    await sendSMS(
      tenantPhone,
      `LocaStay: Aapka rent tracker shuru hua. Property: ${propertyTitle ?? 'your property'}. ` +
      `${durationMonths} mahine, ₹${Math.round(rentAmount)}/mahine. ` +
      `Pehla due: ${firstDueStr}. Har mahine ${dueDay} tarikh ko. App: /tenant/rent`,
    );
  }

  revalidatePath('/landlord/tenants');
  revalidatePath('/tenant/rent');
  revalidatePath('/tenant/stay');

  return NextResponse.json({
    success:       true,
    count:         payments.length,
    firstDue:      firstDue.toISOString().split('T')[0],
    endDate,
  });
}
