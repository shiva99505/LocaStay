/**
 * PATCH /api/admin/properties/[id] — admin approves or rejects a property
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { approveProperty, rejectProperty } from '@/lib/supabase/properties';
import { createNotification } from '@/lib/supabase/notifications';
import { getAdminClient } from '@/lib/supabase/admin';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id: propertyId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; reason?: string };
  const { action, reason } = body;

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'Invalid action. Use "APPROVE" or "REJECT".' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Fetch property with landlord user_id for notification
  const { data: property } = await admin
    .from('properties')
    .select('id, title, landlord_profiles(user_id)')
    .eq('id', propertyId)
    .single() as { data: { id: string; title: string; landlord_profiles: { user_id: string }[] } | null };

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  if (!property.landlord_profiles || property.landlord_profiles.length === 0) {
    return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
  }

  if (action === 'APPROVE') {
    await approveProperty(admin, propertyId);
  } else {
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
    }
    await rejectProperty(admin, propertyId, reason);
  }

  const landlordUserId = property.landlord_profiles[0].user_id;

  await createNotification(admin, {
    userId:  landlordUserId,
    type:    'SYSTEM',
    title:   action === 'APPROVE' ? 'Property Approved' : 'Property Rejected',
    message: action === 'APPROVE'
      ? `Your property "${property.title}" has been approved and is now live.`
      : `Your property "${property.title}" was rejected. Reason: ${reason}`,
    link:    '/landlord/properties',
  });

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id:    auth.user?.id,
    action:      action === 'APPROVE' ? 'APPROVE_LISTING' : 'REJECT_LISTING',
    entity_type: 'PROPERTY',
    entity_id:   propertyId,
    metadata:    { reason },
  });

  return NextResponse.json({ success: true });
}
