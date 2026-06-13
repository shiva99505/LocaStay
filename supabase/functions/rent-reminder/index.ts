/**
 * Supabase Edge Function: rent-reminder
 *
 * Runs on a cron schedule (daily at 8:00 AM IST) to:
 *  1. Find all PENDING rent_payments due within the next 3 days.
 *  2. Send in-app notifications + optional email to each tenant.
 *  3. Mark payments that are past due as OVERDUE.
 *
 * Deploy:
 *   supabase functions deploy rent-reminder --no-verify-jwt
 *
 * Schedule in Supabase Dashboard → Edge Functions → Schedules:
 *   Cron: "30 2 * * *"  (02:30 UTC = 08:00 IST)
 *
 * Or invoke manually via HTTP POST for testing.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

interface RentPaymentRow {
  id:          string;
  tenant_id:   string;
  property_id: string;
  period:      string;
  amount:      number;
  due_date:    string;
  status:      string;
}

interface ProfileRow {
  id:    string;
  name:  string;
  email: string;
}

interface PropertyRow {
  id:    string;
  title: string;
}

Deno.serve(async (req: Request) => {
  // Verify invocation secret
  const authHeader   = req.headers.get('Authorization');
  const cronSecret   = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const now            = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 86_400_000);
  const stats          = { reminded: 0, markedOverdue: 0, errors: 0 };

  // ── 1. Send reminders for payments due in ≤3 days ──────────────────────────

  const { data: upcoming, error: upcomingErr } = await supabase
    .from('rent_payments')
    .select('id, tenant_id, property_id, period, amount, due_date')
    .eq('status', 'PENDING')
    .gte('due_date', now.toISOString())
    .lte('due_date', threeDaysLater.toISOString());

  if (upcomingErr) {
    console.error('rent-reminder: fetch upcoming failed', upcomingErr);
    return new Response(JSON.stringify({ error: upcomingErr.message }), { status: 500 });
  }

  for (const payment of (upcoming ?? []) as RentPaymentRow[]) {
    try {
      const [{ data: tenant }, { data: property }] = await Promise.all([
        supabase.from('profiles').select('id, name, email').eq('id', payment.tenant_id).single(),
        supabase.from('properties').select('id, title').eq('id', payment.property_id).single(),
      ]);

      if (!tenant || !property) continue;

      const dueDate = new Date(payment.due_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

      await supabase.from('notifications').insert({
        user_id: payment.tenant_id,
        type:    'PAYMENT',
        title:   'Rent Due Reminder',
        message: `Your rent of ₹${payment.amount.toLocaleString('en-IN')} for "${(property as PropertyRow).title}" is due on ${dueDate}.`,
        link:    `/tenant/rent`,
      });

      await sendRentReminderEmail({
        supabase,
        to:       (tenant as ProfileRow).email,
        name:     (tenant as ProfileRow).name,
        property: (property as PropertyRow).title,
        amount:   payment.amount,
        dueDate,
        paymentId: payment.id,
      });

      stats.reminded++;
    } catch (e) {
      console.error('rent-reminder: error processing payment', payment.id, e);
      stats.errors++;
    }
  }

  // ── 2. Mark overdue payments ────────────────────────────────────────────────

  const { data: overduePayments, error: overdueErr } = await supabase
    .from('rent_payments')
    .update({ status: 'OVERDUE' })
    .eq('status', 'PENDING')
    .lt('due_date', now.toISOString())
    .select('id, tenant_id, property_id, amount, due_date');

  if (overdueErr) {
    console.error('rent-reminder: mark overdue failed', overdueErr);
  }

  for (const payment of (overduePayments ?? []) as RentPaymentRow[]) {
    try {
      const dueDate = new Date(payment.due_date).toLocaleDateString('en-IN');
      await supabase.from('notifications').insert({
        user_id: payment.tenant_id,
        type:    'PAYMENT',
        title:   'Rent Overdue',
        message: `Your rent of ₹${payment.amount.toLocaleString('en-IN')} was due on ${dueDate} and is now overdue. Late fees may apply.`,
        link:    `/tenant/rent`,
      });
      stats.markedOverdue++;
    } catch (e) {
      console.error('rent-reminder: overdue notification failed', payment.id, e);
      stats.errors++;
    }
  }

  // ── 3. Log analytics event ──────────────────────────────────────────────────

  await supabase.from('analytics_events').insert({
    type:     'SYSTEM',
    metadata: { event: 'rent_reminder_cron', ...stats, ran_at: now.toISOString() },
  });

  console.log('rent-reminder completed', stats);

  return new Response(JSON.stringify({ ok: true, stats }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ─── Email helper ─────────────────────────────────────────────────────────────

interface RentReminderEmailPayload {
  supabase:  ReturnType<typeof createClient>;
  to:        string;
  name:      string;
  property:  string;
  amount:    number;
  dueDate:   string;
  paymentId: string;
}

async function sendRentReminderEmail(payload: RentReminderEmailPayload): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const appUrl       = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://locastay.in';

  if (!resendApiKey) {
    console.log('[EMAIL-REMINDER]', JSON.stringify({ to: payload.to, amount: payload.amount, dueDate: payload.dueDate }));
    return;
  }

  const formattedAmount = `₹${payload.amount.toLocaleString('en-IN')}`;

  const html = `
    <h2>Rent Payment Reminder — LocaStay</h2>
    <p>Hi ${payload.name},</p>
    <p>This is a friendly reminder that your rent payment is due soon.</p>
    <table style="border-collapse:collapse;width:100%;max-width:400px">
      <tr><td style="padding:8px;background:#f3f4f6"><strong>Property</strong></td><td style="padding:8px">${payload.property}</td></tr>
      <tr><td style="padding:8px;background:#f3f4f6"><strong>Amount</strong></td><td style="padding:8px">${formattedAmount}</td></tr>
      <tr><td style="padding:8px;background:#f3f4f6"><strong>Due Date</strong></td><td style="padding:8px">${payload.dueDate}</td></tr>
    </table>
    <br>
    <a href="${appUrl}/tenant/rent"
       style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
      Pay Now
    </a>
    <p style="color:#6b7280;font-size:12px;margin-top:24px">
      © ${new Date().getFullYear()} LocaStay. Do not reply to this email.
    </p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'LocaStay <noreply@locastay.in>',
      to:      [payload.to],
      subject: `Rent Reminder: ${formattedAmount} due on ${payload.dueDate}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`rent-reminder: email send failed (${res.status}): ${body}`);
  }
}
