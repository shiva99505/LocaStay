import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/sms';

const GRACE_DAYS    = 5;
const LATE_FEE_RATE = 0.02; // 2% of rent

/**
 * GET /api/rent-tracker/remind
 * Call daily via external cron (e.g. cron-job.org).
 *
 * 1. Marks PENDING payments as OVERDUE after grace period expires.
 *    Grace = GRACE_DAYS after due_date. Adds late_fee at that point.
 * 2. Sends SMS + in-app notification to tenant for payments due within 3 days.
 * 3. Sends in-app notification to landlord for the same payments.
 *
 * Protect with CRON_SECRET env var (Bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // ── 1. Auto-mark OVERDUE (after grace period) ─────────────────
  // Grace deadline = due_date + GRACE_DAYS → mark OVERDUE if grace deadline < today
  // i.e. due_date < today - GRACE_DAYS
  const graceCutoff = new Date(today.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000);
  const graceCutoffStr = graceCutoff.toISOString().split('T')[0];

  const { data: toMarkOverdue = [] } = await admin
    .from('rent_payments')
    .select('id, amount')
    .eq('status', 'PENDING')
    .lt('due_date', graceCutoffStr);

  for (const payment of (toMarkOverdue ?? [])) {
    const lateFee = Math.max(200, Math.round(payment.amount * LATE_FEE_RATE));
    await admin.from('rent_payments')
      .update({ status: 'OVERDUE', late_fee: lateFee })
      .eq('id', payment.id);
  }

  // ── 2. Find payments needing reminders ────────────────────────
  // A. Payments due within the next 3 days (including today) — remind before it's late
  const threeDays = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysStr = threeDays.toISOString().split('T')[0];

  const [{ data: upcomingPayments = [] }, { data: overduePayments = [] }] = await Promise.all([
    // Upcoming: PENDING payments due between today and today+3 days
    admin.from('rent_payments')
      .select('id, tenant_id, property_id, amount, due_date, period')
      .eq('status', 'PENDING')
      .gte('due_date', todayStr)
      .lte('due_date', threeDaysStr),

    // All OVERDUE: remind landlord and tenant to pay
    admin.from('rent_payments')
      .select('id, tenant_id, property_id, amount, late_fee, due_date, period')
      .eq('status', 'OVERDUE'),
  ]);

  const allPayments = [
    ...(upcomingPayments ?? []).map((p: any) => ({ ...p, isOverdue: false })),
    ...(overduePayments  ?? []).map((p: any) => ({ ...p, isOverdue: true  })),
  ];

  if (!allPayments.length) {
    return NextResponse.json({ markedOverdue: (toMarkOverdue ?? []).length, sent: 0, notifications: 0 });
  }

  // ── 3. Fetch tenant profiles + properties ─────────────────────
  const tenantIds = [...new Set(allPayments.map((p: any) => p.tenant_id as string))];
  const propIds   = [...new Set(allPayments.map((p: any) => p.property_id as string))];

  const [{ data: profiles = [] }, { data: props = [] }] = await Promise.all([
    admin.from('profiles').select('id, name, phone').in('id', tenantIds),
    admin.from('properties').select('id, title, landlord_id').in('id', propIds),
  ]);

  const tenantMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  const propMap   = Object.fromEntries((props ?? []).map((p: any) => [p.id, p]));

  // Fetch landlord user_ids
  const lpIds = [...new Set((props ?? []).map((p: any) => p.landlord_id as string).filter(Boolean))];
  const { data: lpRows = [] } = lpIds.length
    ? await admin.from('landlord_profiles').select('id, user_id').in('id', lpIds)
    : { data: [] };
  const lpUserMap = Object.fromEntries((lpRows ?? []).map((lp: any) => [lp.id, lp.user_id as string]));

  let smsSent = 0;
  const notificationsToInsert: any[] = [];
  // Avoid duplicate notifications for same user+payment
  const notifKey = new Set<string>();

  for (const pay of allPayments) {
    const tenant = tenantMap[pay.tenant_id];
    const prop   = propMap[pay.property_id];
    if (!tenant || !prop) continue;

    const dueDateDisplay = new Date(pay.due_date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const amount = `₹${Number(pay.amount).toLocaleString('en-IN')}`;
    const total  = pay.late_fee
      ? `₹${(Number(pay.amount) + Number(pay.late_fee)).toLocaleString('en-IN')} (late fee included)`
      : amount;

    const daysLeft = Math.ceil((new Date(pay.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = pay.isOverdue;

    // ── Tenant SMS
    if (tenant.phone) {
      const msg = isOverdue
        ? `LocaStay URGENT: ${prop.title} ka kiraya ${total} overdue hai. Turant pay karein: /tenant/rent`
        : `LocaStay: ${prop.title} ka kiraya ${amount} ${dueDateDisplay} ko due hai (${daysLeft} din baki). App: /tenant/rent`;
      await sendSMS(tenant.phone, msg);
      smsSent++;
    }

    // ── Tenant in-app notification (deduplicate by tenant+payment)
    const tenantKey = `t-${pay.tenant_id}-${pay.id}`;
    if (!notifKey.has(tenantKey)) {
      notifKey.add(tenantKey);
      notificationsToInsert.push({
        user_id: pay.tenant_id,
        title:   isOverdue ? `Rent Overdue — ${pay.period}` : `Rent Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        message: isOverdue
          ? `${prop.title} ka kiraya ${total} overdue hai. Landlord ko payment karo.`
          : `${prop.title} ka kiraya ${amount} ${dueDateDisplay} ko due hai.`,
        link:    '/tenant/rent',
        is_read: false,
      });
    }

    // ── Landlord in-app notification
    const landlordUserId = lpUserMap[prop.landlord_id];
    if (landlordUserId) {
      const landlordKey = `l-${landlordUserId}-${pay.id}`;
      if (!notifKey.has(landlordKey)) {
        notifKey.add(landlordKey);
        notificationsToInsert.push({
          user_id: landlordUserId,
          title:   isOverdue ? `Tenant Rent Overdue` : `Tenant Rent Due Soon`,
          message: isOverdue
            ? `${tenant.name ?? 'Tenant'} ka ${prop.title} ka kiraya ${total} overdue hai. Unhe remind karein.`
            : `${tenant.name ?? 'Tenant'} ka ${prop.title} ka kiraya ${amount} ${dueDateDisplay} ko due hai.`,
          link:    '/landlord/rent',
          is_read: false,
        });
      }
    }
  }

  if (notificationsToInsert.length > 0) {
    await admin.from('notifications').insert(notificationsToInsert);
  }

  return NextResponse.json({
    markedOverdue:  (toMarkOverdue ?? []).length,
    sent:           smsSent,
    notifications:  notificationsToInsert.length,
  });
}
