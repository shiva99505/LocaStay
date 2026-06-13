import { redirect } from 'next/navigation';
import { Eye, Star, TrendingUp, IndianRupee, Building2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';

export const revalidate = 0;

export default async function LandlordAnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) redirect('/login');

  const [properties, payments, leads] = await Promise.all([
    prisma.property.findMany({
      where: { landlordId: landlordProfile.id },
      select: { id: true, title: true, city: true, rent: true, views: true, rating: true, reviewCount: true, status: true, totalRooms: true, occupiedRooms: true },
      orderBy: { views: 'desc' },
    }),
    prisma.rentPayment.findMany({
      where: { property: { landlordId: landlordProfile.id }, status: 'PAID' },
      select: { amount: true, paidDate: true, period: true },
    }),
    prisma.lead.count({ where: { landlordId: landlordProfile.id } }),
  ]);

  const totalViews = properties.reduce((s, p) => s + p.views, 0);
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const avgRating = properties.filter((p) => p.rating > 0).length > 0
    ? properties.filter((p) => p.rating > 0).reduce((s, p) => s + p.rating, 0) / properties.filter((p) => p.rating > 0).length
    : 0;
  const occupancyPct = properties.reduce((s, p) => s + p.occupiedRooms, 0) /
    Math.max(properties.reduce((s, p) => s + p.totalRooms, 0), 1) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Performance insights across all your properties.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Eye, label: 'Total Views', value: totalViews.toLocaleString('en-IN'), sub: 'Across all listings', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { icon: IndianRupee, label: 'Total Revenue', value: formatCurrency(totalRevenue, { compact: true }), sub: `${payments.length} payments`, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { icon: Star, label: 'Avg. Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : 'No reviews', sub: `${properties.reduce((s, p) => s + p.reviewCount, 0)} reviews`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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
                {properties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{prop.title}</p>
                      <p className="text-xs text-muted-foreground">{prop.city}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(prop.rent)}</td>
                    <td className="px-4 py-3 text-foreground">{prop.views.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{prop.rating > 0 ? <span>⭐ {prop.rating.toFixed(1)} ({prop.reviewCount})</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">{prop.occupiedRooms}/{prop.totalRooms} rooms ({prop.totalRooms > 0 ? Math.round((prop.occupiedRooms / prop.totalRooms) * 100) : 0}%)</td>
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
