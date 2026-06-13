import { redirect } from 'next/navigation';
import { Eye, Star, TrendingUp, IndianRupee, Building2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';

export const revalidate = 30;

export default async function LandlordAnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const supabase = await createClient();
  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) redirect('/login');

  const [{ data: properties = [] }, { data: payments = [] }, { count: leadsCount }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, title, city, rent, views, rating, review_count, status, total_rooms, occupied_rooms')
      .eq('landlord_id', landlordProfile.id)
      .order('views', { ascending: false }),
    supabase
      .from('rent_payments')
      .select('amount, paid_date, period')
      .eq('status', 'PAID')
      .in('property_id',
        // subquery-style: get property ids first
        (await supabase.from('properties').select('id').eq('landlord_id', landlordProfile.id)).data?.map((p: { id: string }) => p.id) ?? []
      ),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', landlordProfile.id),
  ]);

  const leads = leadsCount ?? 0;
  const totalViews = (properties ?? []).reduce((s, p) => s + (p.views ?? 0), 0);
  const totalRevenue = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const ratedProps = (properties ?? []).filter((p) => p.rating > 0);
  const avgRating = ratedProps.length > 0
    ? ratedProps.reduce((s, p) => s + p.rating, 0) / ratedProps.length
    : 0;
  const occupancyPct = (properties ?? []).reduce((s, p) => s + (p.occupied_rooms ?? 0), 0) /
    Math.max((properties ?? []).reduce((s, p) => s + (p.total_rooms ?? 0), 0), 1) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Performance insights across all your properties.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Eye, label: 'Total Views', value: totalViews.toLocaleString('en-IN'), sub: 'Across all listings', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { icon: IndianRupee, label: 'Total Revenue', value: formatCurrency(totalRevenue, { compact: true }), sub: `${(payments ?? []).length} payments`, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { icon: Star, label: 'Avg. Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : 'No reviews', sub: `${(properties ?? []).reduce((s, p) => s + (p.review_count ?? 0), 0)} reviews`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { icon: Building2, label: 'Occupancy', value: `${Math.round(occupancyPct)}%`, sub: `${leads} leads received`, color: 'text-foreground', bg: 'bg-muted' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 space-y-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <p className="font-display text-2xl font-extrabold text-foreground">{stat.value}</p>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Property performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="h-4 w-4 text-primary-600" /> Property Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Property', 'Rent', 'Views', 'Rating', 'Occupancy'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(properties ?? []).map((prop) => (
                  <tr key={prop.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{prop.title}</p>
                      <p className="text-xs text-muted-foreground">{prop.city}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(prop.rent)}</td>
                    <td className="px-4 py-3 text-foreground">{(prop.views ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{prop.rating > 0 ? <span>⭐ {prop.rating.toFixed(1)} ({prop.review_count ?? 0})</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">{prop.occupied_rooms}/{prop.total_rooms} rooms ({prop.total_rooms > 0 ? Math.round(((prop.occupied_rooms ?? 0) / prop.total_rooms) * 100) : 0}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
