'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IndianRupee, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

interface PayRentButtonProps {
  paymentId: string;
  amount: number;
  period: string;
  propertyTitle: string;
  upiId?: string | null;
}

export function PayRentButton({
  paymentId,
  amount,
  period,
  propertyTitle,
  upiId,
}: PayRentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [paid, setPaid] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  const displayUpiId = upiId ?? 'locaStay@ybl';

  function handleConfirmPayment() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { method: 'PATCH' });
        const data = await res.json() as { success?: boolean; receiptNumber?: string; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Payment failed');
        setReceiptNumber(data.receiptNumber ?? null);
        setPaid(true);
        toast.success('Payment successful!');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Payment failed');
      }
    });
  }

  function handleClose() {
    setOpen(false);
    setPaid(false);
    setReceiptNumber(null);
  }

  return (
    <>
      <Button
        size="sm"
        className="h-7 gap-1 rounded-lg px-2.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <IndianRupee className="h-3 w-3" /> Pay Now
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{paid ? 'Payment Successful' : 'Pay Rent via UPI'}</DialogTitle>
            <DialogDescription>
              {paid
                ? `Receipt has been generated for ${period}.`
                : `Scan QR or use UPI ID to pay ${formatCurrency(amount)} for ${period}.`}
            </DialogDescription>
          </DialogHeader>

          {paid ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 dark:bg-secondary-500/20">
                <CheckCircle2 className="h-9 w-9 text-secondary-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{formatCurrency(amount)} Paid</p>
                <p className="text-sm text-muted-foreground">{propertyTitle}</p>
                <p className="mt-2 text-xs font-mono text-muted-foreground">
                  Receipt: {receiptNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Property + Amount info */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
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

              {/* Simulated UPI QR area */}
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-5 dark:border-primary-500/30 dark:bg-primary-500/5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-500/20">
                  <Smartphone className="h-8 w-8 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UPI ID</p>
                  <p className="mt-0.5 text-base font-bold text-foreground">{displayUpiId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Send exactly <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {paid ? (
              <Button className="w-full bg-secondary-600 hover:bg-secondary-700" onClick={handleClose}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  className="bg-secondary-600 hover:bg-secondary-700"
                  onClick={handleConfirmPayment}
                  disabled={isPending}
                  loading={isPending}
                >
                  Confirm Payment
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
