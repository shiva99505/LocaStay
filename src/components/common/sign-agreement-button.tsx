'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SignAgreementButton({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSign() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/agreements/${agreementId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SIGN' }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to sign');
        toast.success('Agreement signed successfully');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to sign agreement');
      }
    });
  }

  return (
    <Button size="sm" className="gap-1.5 ml-auto" onClick={handleSign} disabled={isPending} loading={isPending}>
      <CheckCircle2 className="h-3.5 w-3.5" /> Sign Agreement
    </Button>
  );
}
