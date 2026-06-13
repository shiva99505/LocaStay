'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkAllReadButtonProps {
  unreadCount: number;
}

export function MarkAllReadButton({ unreadCount }: MarkAllReadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (unreadCount === 0) return null;

  function handleMarkAllRead() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [] }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success('All notifications marked as read');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleMarkAllRead}
      disabled={isPending}
      loading={isPending}
    >
      <CheckCheck className="h-4 w-4" /> Mark all read
    </Button>
  );
}
