import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

// POST — create or return existing pending fee for this tenant+property+type
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { propertyId, type } = await request.json() as { propertyId: string; type: 'BOOKING' | 'CALL' };
  if (!propertyId || !type) return NextResponse.json({ error: 'propertyId and type required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any;

  // Reuse existing unpaid fee (avoids duplicate charges for same action)
  const { data: existing, error: existingErr } = await admin
    .from('platform_fees')
    .select('id, amount')
    .eq('tenant_id', user.id)
    .eq('property_id', propertyId)
    .eq('type', type)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Table missing — let caller proceed without fee gate
  if (existingErr && (existingErr.code === '42P01' || existingErr.message?.includes('platform_fees'))) {
    return NextResponse.json({ skip: true });
  }

  if (existing) {
    return NextResponse.json({ feeId: existing.id, amount: existing.amount, isExisting: true });
  }

  const { data: fee, error } = await admin
    .from('platform_fees')
    .insert({ tenant_id: user.id, property_id: propertyId, type, amount: 3.00, status: 'PENDING' })
    .select('id, amount')
    .single();

  // Table missing or schema cache not refreshed — let caller proceed without fee gate
  if (error) {
    if (error.code === '42P01' || error.message?.includes('platform_fees')) {
      return NextResponse.json({ skip: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feeId: fee.id, amount: fee.amount });
}
