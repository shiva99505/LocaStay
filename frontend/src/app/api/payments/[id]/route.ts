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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: payment } = await admin
    .from('rent_payments')
    .select('id, tenant_id, property_id, status, amount, period')
    .eq('id', id)
    .single();

  if (!payment)                      return NextResponse.json({ error: 'Payment not found' },            { status: 404 });
  if (payment.tenant_id !== user.id) return NextResponse.json({ error: 'Access denied' },               { status: 403 });
  if (payment.status === 'PAID')     return NextResponse.json({ error: 'Already marked as paid' },      { status: 409 });

  const body = await request.json().catch(() => ({})) as { upiRef?: string };
  void body; // upiRef stored for future audit if needed
  const paidDate = new Date().toISOString().split('T')[0];

  // e.g. "RCP-Jun-2026-A3F7B1"
  const safeP = String(payment.period ?? '').replace(/\s+/g, '-').toUpperCase();
  const receiptNumber = `RCP-${safeP}-${id.slice(0, 6).toUpperCase()}`;

  const { error } = await admin
    .from('rent_payments')
    .update({ status: 'PAID', paid_date: paidDate, receipt_number: receiptNumber })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify tenant (confirmation) + landlord (rent received) — fire & forget
  notifyBothParties(admin, user.id, payment).catch(console.warn);

  revalidatePath('/tenant/rent');
  revalidatePath('/landlord/rent');

  return NextResponse.json({ success: true, receiptNumber });
}

async function notifyBothParties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  tenantId: string,
  payment: { id: string; property_id: string; amount: number; period: string },
) {
  const [{ data: prop }, { data: tenantProfile }] = await Promise.all([
    admin.from('properties').select('title, landlord_id').eq('id', payment.property_id).single(),
    admin.from('profiles').select('name').eq('id', tenantId).single(),
  ]);

  const propTitle   = prop?.title  ?? 'the property';
  const tenantName  = tenantProfile?.name ?? 'Tenant';
  const amount      = `₹${payment.amount.toLocaleString('en-IN')}`;

  // Tenant confirmation notification
  await admin.from('notifications').insert({
    user_id:  tenantId,
    title:    'Rent Payment Recorded',
    message:  `Your rent of ${amount} for ${payment.period} (${propTitle}) has been recorded. Receipt: RCP-${payment.period}-${payment.id.slice(0,6).toUpperCase()}`,
    link:     '/tenant/rent',
    is_read:  false,
  });

  // Landlord notification — need landlord's user_id via landlord_profiles
  if (prop?.landlord_id) {
    const { data: lp } = await admin
      .from('landlord_profiles')
      .select('user_id')
      .eq('id', prop.landlord_id)
      .single();

    if (lp?.user_id) {
      await admin.from('notifications').insert({
        user_id:  lp.user_id,
        title:    'Rent Payment Received',
        message:  `${tenantName} ne ${propTitle} ka kiraya ${amount} (${payment.period}) pay kar diya hai.`,
        link:     '/landlord/rent',
        is_read:  false,
      });
    }
  }
}
