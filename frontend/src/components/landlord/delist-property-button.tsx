'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface DelistPropertyButtonProps {
  propertyId: string;
  propertyTitle: string;
  currentStatus: string;
}

export function DelistPropertyButton({ propertyId, propertyTitle, currentStatus }: DelistPropertyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDelisted = currentStatus === 'DELISTED';
  const action = isDelisted ? 'RELIST' : 'DELIST';

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
        toast.success(isDelisted ? 'Property is now live again!' : 'Property removed from listings');
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
        setOpen(false);
      }
    });
  }

  if (isDelisted) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-green-500/40 text-xs text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-950"
          onClick={() => setOpen(true)}
        >
          <Eye className="h-3.5 w-3.5" /> Publish Listing
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish this property?</DialogTitle>
              <DialogDescription>
                <strong>&ldquo;{propertyTitle}&rdquo;</strong> will be visible to tenants on LocaStay and can receive booking requests again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={isPending} loading={isPending}>
                {isPending ? 'Publishing...' : 'Yes, publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-orange-400/40 text-xs text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
        onClick={() => setOpen(true)}
      >
        <EyeOff className="h-3.5 w-3.5" /> Remove from Listings
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from listings?</DialogTitle>
            <DialogDescription>
              <strong>&ldquo;{propertyTitle}&rdquo;</strong> will be hidden from all public listings and search results.
              <br />
              <span className="mt-1 block text-xs text-muted-foreground">
                Existing bookings and tenants are not affected. You can re-publish anytime.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending} loading={isPending}>
              {isPending ? 'Removing...' : 'Yes, remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
