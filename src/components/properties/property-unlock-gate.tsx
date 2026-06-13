'use client';

import { useState, useTransition } from 'react';
import { Lock, IndianRupee, CheckCircle2, Phone, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { BookPropertyForm } from '@/components/tenant/book-property-form';
import { whatsappLink, telLink } from '@/lib/utils';

interface PropertyUnlockGateProps {
  propertyId: string;
  propertyTitle: string;
  rent: number;
  phone: string;
  initialUnlocked: boolean;
}

export function PropertyUnlockGate({
  propertyId, propertyTitle, rent, phone, initialUnlocked,
}: PropertyUnlockGateProps) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUnlockAttempt() {
    if (unlocked) return;
    setShowPayDialog(true);
  }

  function handlePay() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/unlock`, { method: 'POST' });
        const data = await res.json() as { unlocked?: boolean; error?: string };
        if (!res.ok || !data.unlocked) throw new Error(data.error ?? 'Payment failed');
        setUnlocked(true);
        setShowPayDialog(false);
        toast.success('Property unlocked! You can now contact and book.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Payment failed');
      }
    });
  }

  if (unlocked) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-50/50 px-3 py-2 text-xs text-secondary-700 dark:border-secondary-500/20 dark:bg-secondary-500/5 dark:text-secondary-300">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Access unlocked — contact &amp; booking included
        </div>
        <BookPropertyForm propertyId={propertyId} propertyTitle={propertyTitle} rent={rent} />
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
            <a href={telLink(phone)}><Phone className="h-3.5 w-3.5" /> Call</a>
          </Button>
          <Button asChild size="sm" className="flex-1 gap-1.5 bg-secondary-600 hover:bg-secondary-700">
            <a
              href={whatsappLink(phone, `Hi, I'm interested in your property: ${propertyTitle}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Pay ₹3 to unlock</p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              One-time ₹3 fee unlocks both contact &amp; booking for this property.
            </p>
          </div>
        </div>
        <Button
          className="w-full gap-2 shadow-glow-primary"
          size="lg"
          onClick={handleUnlockAttempt}
        >
          <IndianRupee className="h-4 w-4" /> Pay ₹3 &amp; Unlock
        </Button>
      </div>

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock this property — ₹3</DialogTitle>
            <DialogDescription>
              A one-time ₹3 platform fee gives you full access to contact the landlord and submit a booking request for <strong>{propertyTitle}</strong>. Both features are included in this single payment.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary-600" />
              <span>Call &amp; WhatsApp landlord</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary-600" />
              <span>Submit booking request</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary-600" />
              <span>One-time fee, unlimited access to this property</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="gap-2 bg-primary-700 hover:bg-primary-800"
              onClick={handlePay}
              disabled={isPending}
              loading={isPending}
            >
              <IndianRupee className="h-4 w-4" />
              {isPending ? 'Processing...' : 'Pay ₹3 Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
