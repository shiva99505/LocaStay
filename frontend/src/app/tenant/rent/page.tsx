import { redirect } from 'next/navigation';
import {
  CheckCircle2, Clock, IndianRupee, AlertTriangle,
  Lock, Timer, ShieldAlert,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { PayRentButton } from '@/components/tenant/pay-rent-button';
import { PaidHistoryToggle } from '@/components/tenant/paid-history-toggle';

export const revalidate = 0;

const GRACE_DAYS = 5;

function daysFromNow(dateStr: string): number {
  const due = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function displayPeriod(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  return period;
}

export default async function RentTrackerPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any;

  const { data: rawPayments = [] } = await admin
    .from('rent_payments')
    .select('id, property_id, booking_id, period, amount, late_fee, due_date, paid_date, status, receipt_number')
    .eq('tenant_id', session.user.id)
    .order('due_date', { ascending: true });

  const propIds = [...new Set((rawPayments ?? []).map((p: any) => p.property_id as string))];

  const [{ data: propRows = [] }, { data: agreeRows = [] }] = await Promise.all([
    propIds.length
      ? admin.from('properties').select('id, title, city, state, landlord_id').in('id', propIds)
      : Promise.resolve({ data: [] }),
    propIds.length
      ? admin.from('agreements')
          .select('id, property_id, start_date, end_date, rent_amount, status')
          .eq('tenant_id', session.user.id)
          .eq('status', 'ACTIVE')
          .in('property_id', propIds)
      : Promise.resolve({ data: [] }),
  ]);

  const landlordIds = [...new Set((propRows ?? []).map((p: any) => p.landlord_id as string).filter(Boolean))];
  const { data: lpRows = [] } = landlordIds.length
    ? await admin.from('landlord_profiles').select('id, upi_id').in('id', landlordIds)
    : { data: [] };

  const lpUpiMap    = Object.fromEntries((lpRows  ?? []).map((lp: any) => [lp.id, lp.upi_id as string | null]));
  const propMap     = Object.fromEntries((propRows ?? []).map((p: any)  => [p.id, { ...p, upiId: lpUpiMap[p.landlord_id] ?? null }]));
  const agreeByProp = Object.fromEntries((agreeRows ?? []).map((a: any) => [a.property_id, a]));

  const payments = (rawPayments ?? [])
    .map((p: any) => ({ ...p, property: propMap[p.property_id] ?? null }))
    .filter((p: any) => p.property)
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (payments.length === 0) {
    return (
      <EmptyState />
    );
  }

  // Split into paid vs unpaid
  const paidList   = payments.filter((p: any) => p.status === 'PAID');
  const unpaidList = payments.filter((p: any) => p.status !== 'PAID');
  // overdue first, then by due_date
  unpaidList.sort((a: any, b: any) => {
    if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
    if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return  1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Active = first unpaid; next = second unpaid (preview only)
  const activePayment = unpaidList[0] ?? null;
  const nextPayment   = unpaidList[1] ?? null;

  const activeDays  = activePayment ? daysFromNow(activePayment.due_date) : null;
  const canPay      = activePayment && (
    activePayment.status === 'OVERDUE' ||
    (activeDays !== null && activeDays <= 3)
  );

  const totalMonths = payments.length;
  const paidCount   = paidList.length;
  const leasePct    = totalMonths > 0 ? Math.round((paidCount / totalMonths) * 100) : 0;
  const totalPaid   = paidList.reduce((s: number, p: any) => s + p.amount + (p.late_fee ?? 0), 0);

  // First active agreement for lease dates
  const activeAgreement = Object.values(agreeByProp)[0] as any ?? null;
  const leaseStart = activeAgreement?.start_date ? new Date(activeAgreement.start_date + 'T00:00:00') : null;
  const leaseEnd   = activeAgreement?.end_date   ? new Date(activeAgreement.end_date   + 'T00:00:00') : null;

  // Property for the active payment
  const activeProp = activePayment?.property ?? null;

  const isOverdue  = activePayment?.status === 'OVERDUE';
  const inGrace    = !isOverdue && activeDays !== null && activeDays < 0;
  const graceEnds  = inGrace
    ? new Date(new Date(activePayment.due_date).getTime() + GRACE_DAYS * 86400000)
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Rent Tracker</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {activeProp ? `${activeProp.title} · ${activeProp.city}` : 'Track your rent payments'}
        </p>
      </div>

      {/* ── Lease progress ───────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Lease Progress</span>
            <span className="font-bold text-foreground">{paidCount}/{totalMonths} months</span>
          </div>
          <Progress value={leasePct} className="h-2.5 rounded-full" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {leaseStart ? (
              <span>{leaseStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            ) : <span />}
            <span className="font-medium text-foreground">{formatCurrency(totalPaid)} paid</span>
            {leaseEnd ? (
              <span>{leaseEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            ) : <span />}
          </div>
        </CardContent>
      </Card>

      {/* ── Overdue alert banner ─────────────────────────────────── */}
      {isOverdue && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50/60 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-bold">Rent overdue!</span> Late fee of {formatCurrency(activePayment.late_fee ?? 0)} applied.
            Pay immediately to avoid further penalties.
          </p>
        </div>
      )}

      {/* ── All paid — done state ────────────────────────────────── */}
      {!activePayment && (
        <Card className="border-secondary-300 bg-secondary-50/40 dark:border-secondary-500/30">
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-100 dark:bg-secondary-500/20">
              <CheckCircle2 className="h-7 w-7 text-secondary-600" />
            </div>
            <div>
              <p className="font-bold text-foreground">All rent paid! 🎉</p>
              <p className="text-sm text-muted-foreground">You&apos;re fully up to date. Great work.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CURRENT PAYMENT — prominent ─────────────────────────── */}
      {activePayment && (
        <div className={cn(
          'rounded-2xl border-2 p-5',
          isOverdue ? 'border-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/5'
          : inGrace  ? 'border-orange-400 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-500/5'
          : canPay   ? 'border-amber-400 bg-amber-50/50 dark:border-amber-500/50 dark:bg-amber-500/5'
          :             'border-primary-300 bg-primary-50/30 dark:border-primary-500/30 dark:bg-primary-500/5',
        )}>
          {/* Month label + status badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <p className="font-display text-xl font-extrabold text-foreground">
                {displayPeriod(activePayment.period)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Due {formatDate(activePayment.due_date)}</p>
            </div>
            <StatusBadge
              isOverdue={isOverdue}
              inGrace={inGrace}
              canPay={!!canPay}
              activeDays={activeDays}
              graceEnds={graceEnds}
            />
          </div>

          {/* Amount */}
          <div className="mb-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(activePayment.amount + (activePayment.late_fee ?? 0))}
              </span>
              {(activePayment.late_fee ?? 0) > 0 && (
                <span className="text-sm text-red-500">
                  (₹{activePayment.amount.toLocaleString('en-IN')} + ₹{activePayment.late_fee} late fee)
                </span>
              )}
            </div>
          </div>

          {/* Pay button or countdown */}
          {canPay ? (
            <PayRentButton
              paymentId={activePayment.id}
              amount={activePayment.amount + (activePayment.late_fee ?? 0)}
              period={displayPeriod(activePayment.period)}
              propertyTitle={activeProp?.title ?? ''}
              upiId={activeProp?.upiId}
              size="lg"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              {activeDays !== null && activeDays > 3
                ? `Pay button unlocks ${activeDays - 3} days before due date`
                : 'Processing...'}
            </div>
          )}
        </div>
      )}

      {/* ── NEXT PAYMENT — preview (one peek ahead) ─────────────── */}
      {nextPayment && (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{displayPeriod(nextPayment.period)}</p>
            <p className="text-xs text-muted-foreground">Due {formatDate(nextPayment.due_date)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-muted-foreground">{formatCurrency(nextPayment.amount)}</p>
            <p className="text-[10px] text-muted-foreground">
              {(() => {
                const d = daysFromNow(nextPayment.due_date);
                if (d > 30) return `in ${Math.ceil(d / 30)} months`;
                if (d > 1)  return `in ${d} days`;
                return 'soon';
              })()}
            </p>
          </div>
        </div>
      )}

      {/* ── PAID HISTORY — collapsible ───────────────────────────── */}
      {paidList.length > 0 && (
        <PaidHistoryToggle payments={paidList} />
      )}
    </div>
  );
}

function StatusBadge({ isOverdue, inGrace, activeDays, graceEnds }: {
  isOverdue: boolean; inGrace: boolean; canPay?: boolean;
  activeDays: number | null; graceEnds: string | null;
}) {
  if (isOverdue) return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" /> Overdue
    </Badge>
  );
  if (inGrace) return (
    <Badge variant="warning" className="gap-1">
      <ShieldAlert className="h-3 w-3" /> Grace · Pay by {graceEnds}
    </Badge>
  );
  if (activeDays !== null && activeDays === 0) return (
    <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Due Today</Badge>
  );
  if (activeDays !== null && activeDays === 1) return (
    <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Due Tomorrow</Badge>
  );
  if (activeDays !== null && activeDays <= 3) return (
    <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Due in {activeDays} days</Badge>
  );
  return (
    <Badge variant="info" className="gap-1">
      <Timer className="h-3 w-3" />
      {activeDays !== null ? `${activeDays} days away` : 'Upcoming'}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Rent Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track all rent payments and pay securely via UPI.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <IndianRupee className="h-12 w-12 text-muted-foreground/20" />
          <p className="font-display text-lg font-bold text-foreground">No rent tracker yet</p>
          <p className="text-sm text-muted-foreground">
            Your landlord will set up the rent tracker after approving your booking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
