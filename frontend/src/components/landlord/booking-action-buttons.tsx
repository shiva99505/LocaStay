'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
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

export function LandlordBookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (status !== 'PENDING') return null;

  function handleApprove() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'APPROVED' }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success('Booking approved');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'REJECTED', reason: reason.trim() || undefined }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success('Booking rejected');
        setRejectOpen(false);
        setReason('');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <>
      <div className="flex gap-1">
        <Button
          size="sm"
          className="h-7 gap-1 rounded-lg bg-secondary-600 px-2.5 text-xs hover:bg-secondary-700"
          onClick={handleApprove}
          disabled={isPending}
          loading={isPending}
        >
          <CheckCircle2 className="h-3 w-3" /> Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 rounded-lg px-2.5 text-xs text-destructive hover:bg-destructive/10"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
        >
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Provide an optional reason that will be sent to the tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason-landlord">Reason (optional)</Label>
            <Textarea
              id="reject-reason-landlord"
              placeholder="e.g. Property already rented, dates not suitable…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
              loading={isPending}
            >
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
