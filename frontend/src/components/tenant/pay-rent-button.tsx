'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IndianRupee, Smartphone, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

const LOCASTAY_UPI  = process.env.NEXT_PUBLIC_LOCASTAY_UPI_ID ?? 'locaStay@ybl';
const LOCASTAY_NAME = 'LocaStay Rent';

interface PayRentButtonProps {
  paymentId: string;
  amount: number;
  period: string;
  propertyTitle: string;
  upiId?: string | null;
  size?: 'sm' | 'lg';
}

export function PayRentButton({
  paymentId, amount, period, propertyTitle, upiId, size = 'sm',
}: PayRentButtonProps) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [isPending, startT]       = useTransition();
  const [paid, setPaid]           = useState(false);
  const [receiptNumber, setReceipt] = useState<string | null>(null);
  const [upiRef, setUpiRef]       = useState('');

  const payeeUpiId   = upiId ?? LOCASTAY_UPI;
  const payeeName    = upiId ? 'Landlord' : LOCASTAY_NAME;
  const upiNote      = `Rent ${period} - ${propertyTitle}`;
  const upiLink      = `upi://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const qrUrl        = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&qzone=1&data=${encodeURIComponent(upiLink)}`;

  function handleConfirmPayment() {
    startT(async () => {
      try {
        const res  = await fetch(`/api/payments/${paymentId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ upiRef: upiRef.trim() || null }),
        });
        const data = await res.json() as { success?: boolean; receiptNumber?: string; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Payment failed');
        setReceipt(data.receiptNumber ?? null);
        setPaid(true);
        toast.success('Payment recorded successfully!');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Payment failed');
      }
    });
  }

  function handleClose() {
    if (paid) router.refresh();
    setOpen(false);
    setPaid(false);
    setReceipt(null);
    setUpiRef('');
  }

  return (
    <>
      <Button
        size={size}
        className={size === 'lg' ? 'gap-2 px-6' : 'h-7 gap-1 rounded-lg px-2.5 text-xs'}
        onClick={() => setOpen(true)}
      >
        <IndianRupee className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} /> Pay Now
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{paid ? 'Payment Recorded!' : 'Pay Rent via UPI'}</DialogTitle>
            <DialogDescription>
              {paid
                ? `Receipt generated for ${period}.`
                : `Pay ${formatCurrency(amount)} for ${period} via UPI.`}
            </DialogDescription>
          </DialogHeader>

          {paid ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 dark:bg-secondary-500/20">
                <CheckCircle2 className="h-9 w-9 text-secondary-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-bold text-foreground">{formatCurrency(amount)} Paid</p>
                <p className="text-sm text-muted-foreground">{propertyTitle}</p>
                <p className="text-xs text-muted-foreground">Period: {period}</p>
                {receiptNumber && (
                  <div className="mt-2 rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-2 dark:border-secondary-500/30 dark:bg-secondary-500/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Receipt Number</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-secondary-700 dark:text-secondary-300">{receiptNumber}</p>
                  </div>
                )}
                {upiRef && (
                  <p className="text-xs text-muted-foreground">UPI Ref: <span className="font-mono">{upiRef}</span></p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Payment summary */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property</span>
                  <span className="max-w-[160px] truncate text-right font-semibold text-foreground">{propertyTitle}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-semibold text-foreground">{period}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                </div>
              </div>

              {/* QR + UPI ID */}
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-4 dark:border-primary-500/30 dark:bg-primary-500/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="UPI QR code" width={150} height={150} className="rounded-xl" />
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UPI ID</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{payeeUpiId}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pay exactly <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.href = upiLink; }}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                >
                  <Smartphone className="h-3.5 w-3.5" /> Open UPI App
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  UPI app nahi khula? QR scan karo ya ID type karo
                </p>
              </div>

              {/* Optional UPI ref */}
              <div className="space-y-1.5">
                <Label htmlFor="rent-upi-ref" className="text-xs">
                  UPI Transaction ID <span className="text-muted-foreground">(optional, for your records)</span>
                </Label>
                <Input
                  id="rent-upi-ref"
                  placeholder="e.g. T2506151234ABCD"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {paid ? (
              <Button className="w-full gap-1.5 bg-secondary-600 hover:bg-secondary-700" onClick={handleClose}>
                <Download className="h-3.5 w-3.5" /> Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
                <Button
                  className="gap-1.5 bg-secondary-600 hover:bg-secondary-700"
                  onClick={handleConfirmPayment}
                  disabled={isPending}
                  loading={isPending}
                >
                  <IndianRupee className="h-3.5 w-3.5" /> I&apos;ve Paid
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
