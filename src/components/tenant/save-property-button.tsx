'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SavePropertyButtonProps {
  propertyId: string;
  initialSaved?: boolean;
}

export function SavePropertyButton({ propertyId, initialSaved }: SavePropertyButtonProps) {
  const [saved, setSaved] = useState(initialSaved ?? false);
  const [isPending, startTransition] = useTransition();

  // Fetch initial saved state from server if not provided
  useEffect(() => {
    if (initialSaved !== undefined) return;
    fetch(`/api/properties/${propertyId}/save`)
      .then((r) => r.json())
      .then((data: { saved?: boolean }) => {
        if (typeof data.saved === 'boolean') setSaved(data.saved);
      })
      .catch(() => {});
  }, [propertyId, initialSaved]);

  function handleToggle() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/save`, { method: 'POST' });
        const data = await res.json() as { saved?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed');
        const newSaved = data.saved ?? !saved;
        setSaved(newSaved);
        toast.success(newSaved ? 'Property saved' : 'Removed from saved');
      } catch {
        toast.error('Failed to update saved status');
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1 gap-1.5"
      onClick={handleToggle}
      disabled={isPending}
    >
      <Heart
        className={cn('h-3.5 w-3.5 transition-colors', saved && 'fill-red-500 text-red-500')}
      />
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
