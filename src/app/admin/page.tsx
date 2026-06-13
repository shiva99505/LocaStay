import { cache } from 'react';
import { redirect } from 'next/navigation';
import {
  Users, Building2, BookOpen, IndianRupee, AlertTriangle,
  Clock, CheckCircle2,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { getAdminCounts } from '@/lib/data-access';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, timeAgo, initials, cn } from '@/lib/utils';
import Link from 'next/link';
import { PropertyActionButtons } from '@/components/admin/admin-action-buttons';

export const revalidate = 0;

const getAdminData = cache(async () => {
  const [
    counts,
    totalPayments,
    recentUsers,
    flaggedProperties,
    pendingBookings,
  ] = await Promise.all([
    getAdminCounts(),
    prisma.rentPayment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true, isVerified: true },
    }),
    prisma.property.findMany({
      where: { status: 'PENDING' },
      take: 5,
      include: { landlord: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.findMany({
      where: { status: 'PENDING' },
      take: 5,
      include: {
        tenant: { select: { name: true, phone: true } },
        property: { select: { title: true, city: true, rent: true } },
      },
      orderBy: { requestedAt: 'desc' },
    }),
  ]);

  return { ...counts, totalPayments, recentUsers, flaggedProperties, pendingBookings };
});

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  const {
    totalUsers, totalTenants, totalLandlords, totalProperties,
    pendingProperties, activeBookings,
    totalPayments, recentUsers, flaggedProperties, pendingBookings,
  } = await getAdminData();

  const totalRevenue = totalPayments._sum.amount ?? 0;

  const stats = [
    { icon: Users, label: 'Total Users', value: totalUsers.toLocaleString('en-IN'), sub: `${totalTenants} tenants · ${totalLandlords} landlords`, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10', href: '/admin/users' },
    { icon: Building2, label: 'Properties', value: totalProperties.toLocaleString('en-IN'), sub: `${pendingProperties} pending approval`, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10', href: '/admin/properties' },
    { icon: BookOpen, label: 'Active Bookings', value: activeBookings.toLocaleString('en-IN'), sub: `${pendingBookings.length} awaiting review`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', href: '/admin/bookings' },
    { icon: IndianRupee, label: 'Platform Revenue', value: formatCurrency(totalRevenue, { compact: true }), sub: 'Lifetime collected rent', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10', href: '/admin/reports' },
  ];

  const alerts = [
    pendingProperties > 0 && { type: 'warning', msg: `${pendingProperties} properties pending review`, href: '/admin/properties' },
    pendingBookings.length > 0 && { type: 'info', msg: `${pendingBookings.length} bookings pending`, href: '/admin/bookings' },
  ].filter(Boolean) as { type: string; msg: string; href: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Admin Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform-wide health and activity at a glance.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/reports">View Reports</Link>
        </Button>
      </div>

      {/* Alert banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Link key={alert.href} href={alert.href}
              className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                alert.type === 'warning' ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300')}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {alert.msg}
            </Link>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="transition-shadow hover:shadow-md">
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
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending property approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Clock className="h-4 w-4 text-amber-600" /> Pending Approvals
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Link href="/admin/properties">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {flaggedProperties.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-secondary-400" />
                <p className="text-sm text-muted-foreground">All properties reviewed</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {flaggedProperties.map((prop) => (
                  <div key={prop.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
                      <Building2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{prop.title}</p>
                      <p className="text-xs text-muted-foreground">{prop.city} · by {prop.landlord.user.name}</p>
                    </div>
                    <PropertyActionButtons propertyId={prop.id} status={prop.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent user signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="h-4 w-4 text-primary-600" /> Recent Sign-ups
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Link href="/admin/users">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.name ?? ''} /> : null}
                    <AvatarFallback className="rounded-lg text-xs">{initials(user.name ?? 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', user.role === 'TENANT' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20' : user.role === 'LANDLORD' ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20' : 'bg-red-100 text-red-700')}>{user.role}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(user.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
