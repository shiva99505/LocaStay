'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Trash2, ShieldCheck, ShieldX, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approveProperty, rejectProperty, deleteProperty } from '@/lib/actions/property.actions';

// ── Property Action Buttons ──────────────────────────────────────────────────

export function PropertyActionButtons({
  propertyId,
  status,
}: {
  propertyId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [reason, setReason]           = useState('');

  function handleApprove() {
    startTransition(async () => {
      const result = await approveProperty(propertyId);
      if ('error' in result) toast.error(result.error);
      else { toast.success('Property approved — now visible to tenants'); router.refresh(); }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectProperty(propertyId, reason.trim() || undefined);
      if ('error' in result) toast.error(result.error);
      else { toast.success('Property rejected'); setRejectOpen(false); setReason(''); router.refresh(); }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProperty(propertyId);
      if ('error' in result) toast.error(result.error);
      else { toast.success('Property permanently removed'); setDeleteOpen(false); router.refresh(); }
    });
  }

  return (
    <>
      <div className="flex gap-1.5">
        {/* Approve / Reject only for pending */}
        {status === 'PENDING' && (
          <>
            <Button size="sm"
              className="h-7 w-7 gap-0 rounded-lg bg-secondary-600 px-0 hover:bg-secondary-700"
              onClick={handleApprove} disabled={isPending} title="Approve">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline"
              className="h-7 w-7 gap-0 rounded-lg px-0 text-amber-600 hover:bg-amber-50"
              onClick={() => setRejectOpen(true)} disabled={isPending} title="Reject">
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {/* Delete always visible */}
        <Button size="sm" variant="outline"
          className="h-7 w-7 gap-0 rounded-lg px-0 text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)} disabled={isPending} title="Delete property">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>Provide an optional reason that will be sent to the landlord.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea id="reject-reason" placeholder="e.g. Incomplete information, duplicate listing…"
              value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject Property</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property?</DialogTitle>
            <DialogDescription>
              This will permanently remove the listing along with all associated bookings and reviews. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Yes, Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Booking Action Buttons ───────────────────────────────────────────────────

export function BookingActionButtons({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status !== 'PENDING') return null;

  function handleAction(action: 'APPROVED' | 'REJECTED') {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success(action === 'APPROVED' ? 'Booking approved' : 'Booking rejected');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        className="h-7 w-7 gap-0 rounded-lg bg-secondary-600 px-0 hover:bg-secondary-700"
        onClick={() => handleAction('APPROVED')}
        disabled={isPending}
        title="Approve"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-7 gap-0 rounded-lg px-0 text-destructive hover:bg-destructive/10"
        onClick={() => handleAction('REJECTED')}
        disabled={isPending}
        title="Reject"
      >
        <XCircle className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── User Action Buttons ──────────────────────────────────────────────────────

export function UserActionButtons({
  userId,
  isVerified,
  isSuspended,
}: {
  userId: string;
  isVerified: boolean;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'VERIFY' | 'SUSPEND' | 'UNSUSPEND' | null>(null);

  function openConfirm(action: 'VERIFY' | 'SUSPEND' | 'UNSUSPEND') {
    setPendingAction(action);
    setConfirmOpen(true);
  }

  function handleAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        const msgs = { VERIFY: 'User verified', SUSPEND: 'User suspended', UNSUSPEND: 'User reinstated' };
        toast.success(msgs[action]);
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  const actionLabels = {
    VERIFY: 'Verify user account?',
    SUSPEND: 'Suspend this user? They will lose access.',
    UNSUSPEND: 'Reinstate this user account?',
  };

  return (
    <>
      <div className="flex gap-1.5">
        {!isVerified && !isSuspended && (
          <Button
            size="sm"
            className="h-7 gap-1 rounded-lg bg-secondary-600 px-2.5 text-xs hover:bg-secondary-700"
            onClick={() => openConfirm('VERIFY')}
            disabled={isPending}
          >
            <ShieldCheck className="h-3 w-3" /> Verify
          </Button>
        )}
        {!isSuspended && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 rounded-lg px-2.5 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => openConfirm('SUSPEND')}
            disabled={isPending}
          >
            <ShieldX className="h-3 w-3" /> Suspend
          </Button>
        )}
        {isSuspended && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 rounded-lg px-2.5 text-xs text-secondary-700 hover:bg-secondary-50"
            onClick={() => openConfirm('UNSUSPEND')}
            disabled={isPending}
          >
            <ShieldOff className="h-3 w-3" /> Reinstate
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {pendingAction ? actionLabels[pendingAction] : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === 'SUSPEND' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isPending}
              loading={isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
