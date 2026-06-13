'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Receipt, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface PayBillButtonProps {
  billId: string;
  type: string;
  amount: number;
}

export function PayBillButton({ billId, type, amount }: PayBillButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  function handlePay() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bills/${billId}`, { method: 'PATCH' });
        const data = await res.json() as { success?: boolean; error?: string; receiptNumber?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Payment failed');
        setReceiptNumber(data.receiptNumber ?? null);
        toast.success(`${type} bill paid — ₹${amount.toLocaleString('en-IN')}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Payment failed');
        setOpen(false);
      }
    });
  }

  if (receiptNumber) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button size="sm" className="h-7 rounded-lg px-2.5 text-xs" onClick={() => setOpen(true)}>
          <Receipt className="mr-1 h-3 w-3" /> Receipt
        </Button>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-sm dark:border-secondary-500/20 dark:bg-secondary-500/10">
            <p><span className="text-muted-foreground">Bill type:</span> <span className="font-semibold">{type}</span></p>
            <p><span className="text-muted-foreground">Amount:</span> <span className="font-bold">₹{amount.toLocaleString('en-IN')}</span></p>
            <p><span className="text-muted-foreground">Receipt:</span> <span className="font-mono font-semibold text-xs">{receiptNumber}</span></p>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Button size="sm" className="h-7 rounded-lg px-2.5 text-xs" onClick={() => setOpen(true)}>Pay</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Bill</DialogTitle>
            <DialogDescription>Confirm payment for your {type.toLowerCase()} bill via UPI.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">{type} Bill</span>
              <span className="flex items-center gap-1 text-lg font-extrabold text-foreground">
                <IndianRupee className="h-4 w-4" />{amount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-center text-muted-foreground">Payment will be processed via UPI</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handlePay} disabled={isPending} loading={isPending}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
