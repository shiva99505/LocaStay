/**
 * PATCH /api/admin/users/[id] — verify, suspend, or unsuspend a user account
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { setKycStatus, setUserSuspended } from '@/lib/supabase/profiles';
import { createNotification } from '@/lib/supabase/notifications';
import { getAdminClient } from '@/lib/supabase/admin';

type Params = { params: Promise<{ id: string }> };

const NOTIF_COPY = {
  VERIFY:    { title: 'Account Verified',   message: 'Your account has been verified by LocaStay admin.' },
  SUSPEND:   { title: 'Account Suspended',  message: 'Your account has been suspended. Contact support for assistance.' },
  UNSUSPEND: { title: 'Account Reinstated', message: 'Your account suspension has been lifted. Welcome back!' },
} as const;

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id: targetUserId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string };
  const action = body.action as keyof typeof NOTIF_COPY | undefined;

  if (!action || !NOTIF_COPY[action]) {
    return NextResponse.json({ error: 'Invalid action. Use VERIFY, SUSPEND, or UNSUSPEND.' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Verify user exists
  const { data: user } = await admin.from('profiles').select('id').eq('id', targetUserId).single();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (action === 'VERIFY') {
    await setKycStatus(admin, targetUserId, 'VERIFIED');
    await admin.from('profiles').update({ is_verified: true }).eq('id', targetUserId);
  } else {
    await setUserSuspended(admin, targetUserId, action === 'SUSPEND');
  }

  await createNotification(admin, {
    userId:  targetUserId,
    type:    'KYC',
    title:   NOTIF_COPY[action].title,
    message: NOTIF_COPY[action].message,
  });

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id:    auth.user.id,
    action:      action === 'VERIFY' ? 'VERIFY_KYC' : action === 'SUSPEND' ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
    entity_type: 'USER',
    entity_id:   targetUserId,
  });

  return NextResponse.json({ success: true });
}
