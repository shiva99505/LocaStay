'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Smartphone, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const LOCASTAY_UPI = process.env.NEXT_PUBLIC_LOCASTAY_UPI_ID ?? 'locaStay@ybl';
const LOCASTAY_NAME = 'LocaStay';

interface PlatformFeeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feeId: string;
  amount?: number;
  type: 'BOOKING' | 'CALL';
  propertyTitle: string;
  onSuccess: () => void;
}

export function PlatformFeeDialog({
  open, onOpenChange, feeId, amount = 3, type, propertyTitle, onSuccess,
}: PlatformFeeDialogProps) {
  const [upiRef, setUpiRef]   = useState('');
  const [paid, setPaid]       = useState(false);
  const [isPending, startT]   = useTransition();

  const action = type === 'BOOKING' ? 'Booking request' : 'Landlord call';
  const upiNote = `${action}: ${propertyTitle}`;
  const upiLink = `upi://pay?pa=${encodeURIComponent(LOCASTAY_UPI)}&pn=${encodeURIComponent(LOCASTAY_NAME)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&qzone=1&data=${encodeURIComponent(upiLink)}`;

  function handleConfirm() {
    startT(async () => {
      try {
        const res  = await fetch(`/api/platform-fee/${feeId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ upiRef: upiRef.trim() || null }),
        });
        const data = await res.json() as { success?: boolean; error?: string };

        // If table doesn't exist yet, treat as success so booking isn't blocked
        if (!res.ok && data.error?.includes('platform_fees')) {
          setPaid(true);
          setTimeout(() => { onSuccess(); setPaid(false); setUpiRef(''); onOpenChange(false); }, 900);
          return;
        }

        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');

        setPaid(true);
        toast.success(`₹${amount} platform fee received`);

        setTimeout(() => {
          onSuccess();
          setPaid(false);
          setUpiRef('');
          onOpenChange(false);
        }, 900);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending && !paid) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{paid ? 'Fee Received!' : `Platform Fee — ₹${amount}`}</DialogTitle>
          <DialogDescription>
            {paid
              ? 'Connecting you with the landlord…'
              : `One-time ₹${amount} fee to connect you with the landlord for "${propertyTitle}".`}
          </DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-100 dark:bg-secondary-500/20">
              <CheckCircle2 className="h-8 w-8 text-secondary-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">Thank you!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{action} for</span>
                <span className="max-w-[160px] truncate text-right font-semibold text-foreground">{propertyTitle}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="font-bold text-foreground">₹{amount}</span>
              </div>
            </div>

            {/* UPI QR + deep link */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-4 dark:border-primary-500/30 dark:bg-primary-500/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="UPI QR code" width={150} height={150} className="rounded-xl" />
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UPI ID</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{LOCASTAY_UPI}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pay exactly <span className="font-bold text-foreground">₹{amount}</span>
                </p>
              </div>
              <a
                href={upiLink}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                <Smartphone className="h-3.5 w-3.5" /> Open UPI App
              </a>
              <p className="text-center text-[11px] text-muted-foreground">
                UPI app nahi khula? QR code scan karo ya UPI app mein ID type karo
              </p>
            </div>

            {/* Optional UPI ref */}
            <div className="space-y-1.5">
              <Label htmlFor="plat-upi-ref" className="text-xs">
                UPI Transaction ID <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="plat-upi-ref"
                placeholder="e.g. T2506151234ABCD"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {!paid && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="gap-1.5 bg-secondary-600 hover:bg-secondary-700"
              onClick={handleConfirm}
              disabled={isPending}
              loading={isPending}
            >
              <IndianRupee className="h-3.5 w-3.5" /> I&apos;ve Paid — Continue
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
