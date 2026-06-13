import { redirect } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, formatDate, initials, cn } from '@/lib/utils';
import { PAYMENT_STATUS_META, type PaymentStatus } from '@/lib/constants';
import { RemindButton, BulkRemindButton } from '@/components/landlord/remind-button';

export const revalidate = 0;

export default async function LandlordRentPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const supabase = await createClient();
  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) redirect('/login');

  // Get property ids for this landlord first
  const { data: propIds } = await supabase
    .from('properties')
    .select('id')
    .eq('landlord_id', landlordProfile.id);

  const propertyIds = (propIds ?? []).map((p: { id: string }) => p.id);

  const { data: payments = [] } = await supabase
    .from('rent_payments')
    .select(`
      *,
      tenant:profiles!tenant_id(name, phone, avatar),
      property:properties!property_id(title, city)
    `)
    .in('property_id', propertyIds.length > 0 ? propertyIds : [''])
    .order('due_date', { ascending: false })
    .limit(50);

  const totalCollected = (payments ?? []).filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending = (payments ?? []).filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = (payments ?? []).filter((p) => p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0);
  const paidCount = (payments ?? []).filter((p) => p.status === 'PAID').length;
  const paidPct = (payments ?? []).length > 0 ? Math.round((paidCount / (payments ?? []).length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Rent Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor all rent payments across your properties.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-secondary-200 bg-secondary-50/30 dark:border-secondary-500/20 dark:bg-secondary-500/5">
          <CardContent className="pt-5 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="font-display text-2xl font-extrabold text-foreground">{formatCurrency(totalCollected)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collected ({paidCount} payments)</p>
            <Progress value={paidPct} className="h-1.5" />
          </CardContent>
        </Card>
        <Card className={cn(totalOverdue > 0 && 'border-red-200 bg-red-50/30 dark:border-red-500/20')}>
          <CardContent className="pt-5 space-y-2">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', totalOverdue > 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-muted text-muted-foreground')}><XCircle className="h-5 w-5" /></div>
            <p className="font-display text-2xl font-extrabold text-foreground">{formatCurrency(totalOverdue)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overdue</p>
            {totalOverdue > 0 && (
              <BulkRemindButton
                overduePaymentIds={(payments ?? []).filter((p) => p.status === 'OVERDUE').map((p) => p.id)}
                tenantIds={(payments ?? []).filter((p) => p.status === 'OVERDUE').map((p) => p.tenant_id)}
              />
            )}
          </CardContent>
        </Card>
        <Card className={cn(totalPending > 0 && 'border-amber-200 bg-amber-50/30 dark:border-amber-500/20')}>
          <CardContent className="pt-5 space-y-2">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', totalPending > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20' : 'bg-muted text-muted-foreground')}><Clock className="h-5 w-5" /></div>
            <p className="font-display text-2xl font-extrabold text-foreground">{formatCurrency(totalPending)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="h-4 w-4 text-primary-600" /> Payment History
          </CardTitle>
          <span className="text-sm text-muted-foreground">{(payments ?? []).length} records</span>
        </CardHeader>
        <CardContent className="p-0">
          {(payments ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No payments yet across your properties.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Tenant', 'Property', 'Period', 'Amount', 'Due', 'Paid', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(payments ?? []).map((payment) => {
                    const meta = PAYMENT_STATUS_META[payment.status as PaymentStatus];
                    return (
                      <tr key={payment.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 rounded-lg">
                              {payment.tenant.avatar ? <AvatarImage src={payment.tenant.avatar} alt={payment.tenant.name ?? ''} /> : null}
                              <AvatarFallback className="rounded-lg text-[10px]">{initials(payment.tenant.name ?? 'T')}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{payment.tenant.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground line-clamp-1">{payment.property.title}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{payment.period}</td>
                        <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.due_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{payment.paid_date ? formatDate(payment.paid_date) : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge tone={meta.tone} label={meta.label} /></td>
                        <td className="px-4 py-3">
                          {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                            <RemindButton
                              tenantId={payment.tenant_id}
                              paymentId={payment.id}
                              tenantName={payment.tenant.name ?? 'Tenant'}
                              period={payment.period}
                              amount={payment.amount}
                            />
                          )}
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
    </div>
  );
}
