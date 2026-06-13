import { redirect } from 'next/navigation';
import { TrendingUp, Users, Building2, IndianRupee, BookOpen } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';

export const revalidate = 0;

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  const supabase = await createClient();
  const [
    { data: allUsers = [] },
    { data: allProperties = [] },
    { data: allBookings = [] },
    { data: paidPayments = [] },
    { data: topProperties = [] },
    { data: topLandlords = [] },
  ] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('properties').select('status'),
    supabase.from('bookings').select('status'),
    supabase.from('rent_payments').select('amount').eq('status', 'PAID'),
    supabase
      .from('properties')
      .select('id, title, city, views, rent, rating')
      .order('views', { ascending: false })
      .limit(5),
    supabase
      .from('landlord_profiles')
      .select('response_rate, user:profiles!user_id(name), properties:properties(id)')
      .order('response_rate', { ascending: false })
      .limit(5),
  ]);

  // Aggregate counts from flat arrays
  const userCounts: Record<string, number> = {};
  for (const u of (allUsers ?? [])) userCounts[u.role] = (userCounts[u.role] ?? 0) + 1;

  const propCounts: Record<string, number> = {};
  for (const p of (allProperties ?? [])) propCounts[p.status] = (propCounts[p.status] ?? 0) + 1;

  const bookingCounts: Record<string, number> = {};
  for (const b of (allBookings ?? [])) bookingCounts[b.status] = (bookingCounts[b.status] ?? 0) + 1;

  const totalRevenue = (paidPayments ?? []).reduce((s, p) => s + p.amount, 0);
  const totalPayments = (paidPayments ?? []).length;

  const totalUsers = Object.values(userCounts).reduce((s, c) => s + c, 0);
  const totalProps = Object.values(propCounts).reduce((s, c) => s + c, 0);
  const totalBookings = Object.values(bookingCounts).reduce((s, c) => s + c, 0);

  const kpiCards = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Total Properties', value: totalProps, icon: Building2, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
    { label: 'Total Bookings', value: totalBookings, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue, { compact: true }), icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Reports &amp; Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide performance metrics.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-5 space-y-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', card.bg)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
              <p className="font-display text-2xl font-extrabold text-foreground">{card.value}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User breakdown */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base font-bold"><Users className="h-4 w-4 text-primary-600" /> User Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Tenants', key: 'TENANT', color: 'bg-primary-500' },
              { label: 'Landlords', key: 'LANDLORD', color: 'bg-secondary-500' },
              { label: 'Admins', key: 'ADMIN', color: 'bg-red-500' },
            ].map((item) => {
              const value = userCounts[item.key] ?? 0;
              const pct = totalUsers > 0 ? Math.round((value / totalUsers) * 100) : 0;
              return (
                <div key={item.key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="font-bold text-foreground">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <Progress value={pct} className="h-2" indicatorClassName={item.color} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Property status breakdown */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base font-bold"><Building2 className="h-4 w-4 text-secondary-600" /> Property Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Available', key: 'AVAILABLE', color: 'bg-secondary-500' },
              { label: 'Occupied', key: 'OCCUPIED', color: 'bg-primary-500' },
              { label: 'Pending Review', key: 'PENDING', color: 'bg-amber-500' },
              { label: 'Delisted', key: 'DELISTED', color: 'bg-muted-foreground' },
            ].map((item) => {
              const value = propCounts[item.key] ?? 0;
              const pct = totalProps > 0 ? Math.round((value / totalProps) * 100) : 0;
              return (
                <div key={item.key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="font-bold text-foreground">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <Progress value={pct} className="h-2" indicatorClassName={item.color} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Properties by Views */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base font-bold"><TrendingUp className="h-4 w-4 text-primary-600" /> Top Properties by Views</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(topProperties ?? []).map((prop, i) => (
              <div key={prop.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{prop.title}</p>
                  <p className="text-xs text-muted-foreground">{prop.city}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{(prop.views ?? 0).toLocaleString('en-IN')} views</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(prop.rent)}/mo</p>
                </div>
              </div>
            ))}
            {(topProperties ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No properties yet</p>}
          </CardContent>
        </Card>

        {/* Revenue summary */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base font-bold"><IndianRupee className="h-4 w-4 text-green-600" /> Revenue Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-green-50 p-4 dark:bg-green-500/10">
                <p className="font-display text-2xl font-extrabold text-foreground">{formatCurrency(totalRevenue, { compact: true })}</p>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">Total Collected</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="font-display text-2xl font-extrabold text-foreground">{totalPayments}</p>
                <p className="text-xs font-semibold text-muted-foreground">Successful Payments</p>
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Booking Funnel</p>
              {[
                { label: 'Pending', key: 'PENDING', color: 'text-amber-600' },
                { label: 'Active', key: 'ACTIVE', color: 'text-secondary-600' },
                { label: 'Completed', key: 'COMPLETED', color: 'text-foreground' },
                { label: 'Cancelled', key: 'CANCELLED', color: 'text-red-600' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={cn('font-bold', item.color)}>{bookingCounts[item.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
