'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

function displayPeriod(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  return period;
}

interface Payment {
  id: string;
  period: string;
  amount: number;
  late_fee: number;
  paid_date: string | null;
  receipt_number: string | null;
}

export function PaidHistoryToggle({ payments }: { payments: Payment[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-secondary-600" />
          <span className="text-sm font-semibold text-foreground">
            Payment History
          </span>
          <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-bold text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300">
            {payments.length} paid
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Paid payment rows */}
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {[...payments].reverse().map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 px-4 py-3 bg-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-500/20">
                <CheckCircle2 className="h-4 w-4 text-secondary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{displayPeriod(payment.period)}</p>
                <p className="text-xs text-muted-foreground">
                  Paid {payment.paid_date ? formatDate(payment.paid_date) : '—'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-secondary-600">
                  {formatCurrency(payment.amount + (payment.late_fee ?? 0))}
                </p>
                {payment.receipt_number && (
                  <p className="flex items-center justify-end gap-0.5 text-[10px] font-mono text-muted-foreground mt-0.5">
                    <Receipt className="h-2.5 w-2.5" />
                    {payment.receipt_number}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
