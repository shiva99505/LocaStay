import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const admin = getAdminClient();

  // Verify landlord owns this property
  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: property } = await supabase
    .from('properties')
    .select('id, status, landlord_id')
    .eq('id', id)
    .eq('landlord_id', landlordProfile.id)
    .single();
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  if (body.action === 'DELIST') {
    if (property.status !== 'AVAILABLE') {
      return NextResponse.json({ error: 'Only live properties can be removed from listings.' }, { status: 409 });
    }
    const { data: updated, error } = await (admin as any)
      .from('properties')
      .update({ status: 'DELISTED' })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ property: updated });
  }

  if (body.action === 'RELIST') {
    if (property.status !== 'DELISTED') {
      return NextResponse.json({ error: 'Only delisted properties can be relisted.' }, { status: 409 });
    }
    const { data: updated, error } = await (admin as any)
      .from('properties')
      .update({ status: 'AVAILABLE' })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ property: updated });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
