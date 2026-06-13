'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminSupportResolveButton({ ticketId, status }: { ticketId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(action: 'RESOLVE' | 'IN_PROGRESS') {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/support/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success(action === 'RESOLVE' ? 'Ticket resolved' : 'Ticket marked in progress');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action failed');
      }
    });
  }

  if (status === 'OPEN') {
    return (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 rounded-lg px-2.5 text-xs"
          onClick={() => update('IN_PROGRESS')}
          disabled={isPending}
        >
          <Clock className="h-3 w-3" /> In Progress
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1 rounded-lg bg-secondary-600 px-2.5 text-xs hover:bg-secondary-700"
          onClick={() => update('RESOLVE')}
          disabled={isPending}
          loading={isPending}
        >
          <CheckCircle2 className="h-3 w-3" /> Resolve
        </Button>
      </div>
    );
  }

  if (status === 'IN_PROGRESS') {
    return (
      <Button
        size="sm"
        className="h-7 gap-1 rounded-lg bg-secondary-600 px-2.5 text-xs hover:bg-secondary-700"
        onClick={() => update('RESOLVE')}
        disabled={isPending}
        loading={isPending}
      >
        <CheckCircle2 className="h-3 w-3" /> Resolve
      </Button>
    );
  }

  return null;
}
