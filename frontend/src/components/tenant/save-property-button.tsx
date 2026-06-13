'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleSaveProperty } from '@/lib/actions/booking.actions';

export function SavePropertyButton({
  propertyId,
  initialSaved = false,
}: {
  propertyId: string;
  initialSaved?: boolean;
}) {
  const [saved, setSaved]            = useState(initialSaved);
  const [optimisticSaved, setOpt]    = useOptimistic(saved);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !optimisticSaved;
    startTransition(async () => {
      setOpt(next); // instant — no wait
      const result = await toggleSaveProperty(propertyId);
      if ('error' in result) {
        toast.error(result.error);
        setOpt(saved); // revert
        return;
      }
      setSaved(result.saved);
      toast.success(result.saved ? '❤️ Property saved!' : 'Removed from saved');
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'flex-1 gap-1.5 transition-all duration-150 active:scale-95',
        optimisticSaved && 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
      )}
      onClick={handleToggle}
      disabled={isPending}
      aria-label={optimisticSaved ? 'Unsave property' : 'Save property'}
    >
      <Heart className={cn(
        'h-3.5 w-3.5 transition-all duration-200',
        optimisticSaved ? 'fill-red-500 text-red-500 scale-110' : 'scale-100',
      )} />
      {optimisticSaved ? 'Saved ✓' : 'Save'}
    </Button>
  );
}
