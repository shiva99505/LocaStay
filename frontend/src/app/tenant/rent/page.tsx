import { redirect } from 'next/navigation';
import {
  CheckCircle2, Clock, XCircle, IndianRupee, Receipt,
  TrendingUp, AlertTriangle,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { PAYMENT_STATUS_META, type PaymentStatus } from '@/lib/constants';
import { PayRentButton } from '@/components/tenant/pay-rent-button';

export const revalidate = 0;

export default async function RentTrackerPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const supabase = await createClient();
  const { data: payments = [] } = await supabase
    .from('rent_payments')
    .select(`
      *,
      property:properties!property_id(
        id, title, city, state,
        landlord:landlord_profiles!landlord_id(upi_id)
      )
    `)
    .eq('tenant_id', session.user.id)
    .order('due_date', { ascending: false });

  const paid = (payments ?? []).filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount + p.late_fee, 0);
  const overdue = (payments ?? []).filter((p) => p.status === 'OVERDUE');
  const pending = (payments ?? []).filter((p) => p.status === 'PENDING');
  const paidCount = (payments ?? []).filter((p) => p.status === 'PAID').length;
  const paidPct = (payments ?? []).length > 0 ? Math.round((paidCount / (payments ?? []).length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Rent Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track all rent payments, download receipts, and pay online via UPI.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-secondary-200 bg-secondary-50/40 dark:border-secondary-500/20 dark:bg-secondary-500/5">
          <CardContent className="flex flex-col gap-2 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl font-extrabold text-foreground">{formatCurrency(paid)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Paid ({paidCount} months)</p>
            <Progress value={paidPct} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{paidPct}% of all rent settled</p>
          </CardContent>
        </Card>
        <Card className={cn(overdue.length > 0 ? 'border-red-200 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5' : '')}>
          <CardContent className="flex flex-col gap-2 pt-5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', overdue.length > 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-muted text-muted-foreground')}>
              <XCircle className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl font-extrabold text-foreground">{overdue.length}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue Payments</p>
            {overdue.length > 0 ? (
              <p className="text-xs font-medium text-red-600">
                {formatCurrency(overdue.reduce((s, p) => s + p.amount + p.late_fee, 0))} total outstanding
              </p>
            ) : (
              <p className="text-xs text-secondary-600 dark:text-secondary-400">No overdue payments 🎉</p>
            )}
          </CardContent>
        </Card>
        <Card className={cn(pending.length > 0 ? 'border-amber-200 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5' : '')}>
          <CardContent className="flex flex-col gap-2 pt-5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', pending.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20' : 'bg-muted text-muted-foreground')}>
              <Clock className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl font-extrabold text-foreground">{pending.length}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending Payments</p>
            {pending.length > 0 && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Due: {formatDate(pending[0].due_date)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="h-4 w-4 text-primary-600" /> Payment History
          </CardTitle>
          <span className="text-sm text-muted-foreground">{(payments ?? []).length} record{(payments ?? []).length !== 1 ? 's' : ''}</span>
        </CardHeader>
        <CardContent className="p-0">
          {(payments ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No rent payments found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid On</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(payments ?? []).map((payment) => {
                    const meta = PAYMENT_STATUS_META[payment.status as PaymentStatus];
                    const canPay = payment.status === 'PENDING' || payment.status === 'OVERDUE';
                    return (
                      <tr key={payment.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground">{payment.period}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-1">{payment.property.title} · {payment.property.city}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {formatCurrency(payment.amount)}
                          {payment.late_fee > 0 && (
                            <span className="ml-1 text-xs font-normal text-red-500">+{formatCurrency(payment.late_fee)} late</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.due_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {payment.paid_date ? formatDate(payment.paid_date) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {canPay ? (
                              <PayRentButton
                                paymentId={payment.id}
                                amount={payment.amount + payment.late_fee}
                                period={payment.period}
                                propertyTitle={payment.property.title}
                                upiId={payment.property.landlord?.upi_id}
                              />
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-2.5 text-xs text-muted-foreground">
                                <Receipt className="h-3 w-3" /> Receipt
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UPI payment prompt */}
      {(overdue.length > 0 || pending.length > 0) && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-foreground">
                  You have {overdue.length + pending.length} payment{overdue.length + pending.length > 1 ? 's' : ''} due
                </p>
                <p className="text-sm text-muted-foreground">Pay securely via UPI, NEFT or debit card. Receipts are auto-generated.</p>
              </div>
            </div>
            <Button className="gap-2 shadow-glow-primary shrink-0">
              <IndianRupee className="h-4 w-4" /> Pay via UPI
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
