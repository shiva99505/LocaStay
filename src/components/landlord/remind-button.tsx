'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RemindButtonProps {
  tenantId: string;
  paymentId: string;
  tenantName: string;
  period: string;
  amount: number;
}

export function RemindButton({ tenantId, paymentId, tenantName, period, amount }: RemindButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemind() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/landlord/remind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, paymentId, period, amount }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to send reminder');
        toast.success(`Reminder sent to ${tenantName} for ${period}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send reminder');
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 rounded-lg px-2.5 text-xs"
      onClick={handleRemind}
      disabled={isPending}
      loading={isPending}
    >
      <Send className="h-3 w-3" /> Remind
    </Button>
  );
}

interface BulkRemindButtonProps {
  overduePaymentIds: string[];
  tenantIds: string[];
}

export function BulkRemindButton({ overduePaymentIds, tenantIds }: BulkRemindButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleBulkRemind() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/landlord/remind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: true, paymentIds: overduePaymentIds, tenantIds }),
        });
        const data = await res.json() as { success?: boolean; error?: string; count?: number };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to send reminders');
        toast.success(`Reminders sent to ${data.count ?? tenantIds.length} tenants`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send reminders');
      }
    });
  }

  return (
    <Button
      size="sm"
      className="mt-1 h-7 gap-1 rounded-lg px-2.5 text-xs"
      onClick={handleBulkRemind}
      disabled={isPending || overduePaymentIds.length === 0}
      loading={isPending}
    >
      <Send className="h-3 w-3" /> Send reminders
    </Button>
  );
}
