'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

export function DeletePropertyButton({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to delete property');
        toast.success('Property deleted successfully');
        setOpen(false);
        router.push('/landlord/properties');
        router.refresh();
      } catch (err) {
        setOpen(false);
        toast.error(err instanceof Error ? err.message : 'Something went wrong', { duration: 5000 });
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 gap-1 border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3 w-3" /> Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete property?</DialogTitle>
            <DialogDescription>
              <strong>&ldquo;{propertyTitle}&rdquo;</strong> will be permanently deleted and removed from all listings and search results.
              <br /><span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">Note: Properties with pending or active bookings cannot be deleted. Resolve all bookings first.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              loading={isPending}
            >
              {isPending ? 'Deleting...' : 'Yes, delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
