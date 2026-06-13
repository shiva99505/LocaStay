/**
 * Supabase Edge Function: booking-notification
 *
 * Triggered via Database Webhook on INSERT into the `bookings` table.
 * Sends a notification to the landlord and (optionally) an email.
 *
 * Deploy:
 *   supabase functions deploy booking-notification --no-verify-jwt
 *
 * Register the Database Webhook in the Supabase dashboard:
 *   Table: bookings | Event: INSERT | HTTP POST → this function URL
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

// Deno env types
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingRecord {
  id:              string;
  tenant_id:       string;
  property_id:     string;
  move_in_date:    string;
  duration_months: number;
  message?:        string;
  requested_at:    string;
}

interface WebhookPayload {
  type:   'INSERT' | 'UPDATE' | 'DELETE';
  table:  string;
  schema: string;
  record: BookingRecord;
  old_record: BookingRecord | null;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    // Verify the request comes from Supabase (webhook secret header)
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload: WebhookPayload = await req.json();

    // Only act on INSERT of new bookings
    if (payload.type !== 'INSERT' || payload.table !== 'bookings') {
      return new Response('Ignored', { status: 200 });
    }

    const booking = payload.record;

    // Build the service-role client (bypasses RLS to read landlord info)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── Fetch related data ──────────────────────────────────────────────────

    const [{ data: property }, { data: tenant }] = await Promise.all([
      supabase
        .from('properties')
        .select('id, title, landlord_id, landlord_profiles!inner(id, user_id)')
        .eq('id', booking.property_id)
        .single(),
      supabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('id', booking.tenant_id)
        .single(),
    ]);

    if (!property || !tenant) {
      console.error('booking-notification: property or tenant not found', { booking });
      return new Response('Missing data', { status: 422 });
    }

    const landlordProfile = (property as { landlord_profiles: { user_id: string } }).landlord_profiles;
    const landlordUserId  = landlordProfile.user_id;

    const moveInDate = new Date(booking.move_in_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    // ── Insert in-app notification for the landlord ─────────────────────────

    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: landlordUserId,
      type:    'BOOKING',
      title:   'New Booking Request',
      message: `${tenant.name} has requested to book "${property.title}" from ${moveInDate}.`,
      link:    `/landlord/bookings?id=${booking.id}`,
    });

    if (notifError) {
      console.error('booking-notification: failed to insert notification', notifError);
    }

    // ── Fetch landlord email for external notification ──────────────────────

    const { data: landlordData } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', landlordUserId)
      .single();

    if (landlordData?.email) {
      await sendEmailNotification({
        to:      landlordData.email,
        name:    landlordData.name,
        tenant:  tenant.name,
        property: property.title,
        moveInDate,
        bookingId: booking.id,
        message: booking.message,
      });
    }

    // ── Log audit event ─────────────────────────────────────────────────────

    await supabase.from('analytics_events').insert({
      type:      'BOOKING',
      entity_id: booking.id,
      metadata:  { tenant_id: booking.tenant_id, property_id: booking.property_id },
    });

    console.log(`booking-notification: notified landlord ${landlordUserId} for booking ${booking.id}`);

    return new Response(JSON.stringify({ ok: true }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('booking-notification: unhandled error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

// ─── Email helper ─────────────────────────────────────────────────────────────

interface EmailPayload {
  to:        string;
  name:      string;
  tenant:    string;
  property:  string;
  moveInDate: string;
  bookingId: string;
  message?:  string;
}

async function sendEmailNotification(payload: EmailPayload): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    // Fallback: just log (useful in dev / when email is not configured)
    console.log('[EMAIL] New booking notification', JSON.stringify(payload, null, 2));
    return;
  }

  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://locastay.in';

  const html = `
    <h2>New Booking Request on LocaStay</h2>
    <p>Hi ${payload.name},</p>
    <p><strong>${payload.tenant}</strong> has submitted a booking request for your property
    <strong>"${payload.property}"</strong>.</p>
    <ul>
      <li><strong>Move-in Date:</strong> ${payload.moveInDate}</li>
      ${payload.message ? `<li><strong>Message:</strong> ${payload.message}</li>` : ''}
    </ul>
    <p>
      <a href="${appUrl}/landlord/bookings?id=${payload.bookingId}"
         style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
        Review &amp; Respond
      </a>
    </p>
    <p style="color:#6b7280;font-size:12px">
      You are receiving this because you are a registered landlord on LocaStay.<br>
      © ${new Date().getFullYear()} LocaStay
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
      subject: `New Booking Request for "${payload.property}"`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`booking-notification: email failed (${res.status}): ${body}`);
  }
}
