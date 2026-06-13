import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2, IndianRupee, Plus, ChevronRight,
  MessageSquare, CheckCircle2, Clock,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { LandlordBookingActions } from '@/components/landlord/booking-action-buttons';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { cn, formatCurrency, timeAgo, initials } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { PROPERTY_STATUS_META, type PropertyStatus, PAYMENT_STATUS_META, type PaymentStatus } from '@/lib/constants';

export const revalidate = 0;

export default async function LandlordDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!landlordProfile) redirect('/login');

  const [allProperties, pendingBookings, pendingRentPayments, recentLeads, topPropertiesRaw] = await Promise.all([
    prisma.property.findMany({
      where: { landlordId: landlordProfile.id },
      select: { id: true, title: true, status: true, rent: true, city: true, state: true, totalRooms: true, occupiedRooms: true, rating: true, views: true, isFeatured: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.booking.findMany({
      where: { property: { landlordId: landlordProfile.id }, status: 'PENDING' },
      include: {
        tenant: { select: { name: true, avatar: true, phone: true } },
        property: { select: { title: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 5,
    }),

    prisma.rentPayment.findMany({
      where: { property: { landlordId: landlordProfile.id }, status: { in: ['PENDING', 'OVERDUE'] } },
      include: {
        tenant: { select: { name: true, avatar: true } },
        property: { select: { title: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),

    prisma.lead.findMany({
      where: { landlordId: landlordProfile.id },
      include: { property: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    prisma.property.findMany({
      where: { landlordId: landlordProfile.id },
      include: {
        bookings: { where: { status: 'PENDING' }, select: { id: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
  ]);

  const topProperties = topPropertiesRaw;

  const totalProperties = allProperties.length;
  const available = allProperties.filter((p) => p.status === 'AVAILABLE').length;
  const occupied = allProperties.filter((p) => p.status === 'OCCUPIED').length;
  const totalRent = allProperties.reduce((s, p) => s + (p.rent ?? 0), 0);
  const totalViews = allProperties.reduce((s, p) => s + (p.views ?? 0), 0);
  const ratedProps = allProperties.filter((p) => (p.rating ?? 0) > 0);
  const avgRating = ratedProps.length > 0
    ? ratedProps.reduce((s, p) => s + (p.rating ?? 0), 0) / ratedProps.length
    : 0;

  const overdueRent = pendingRentPayments.filter((p) => p.status === 'OVERDUE');

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Good day, {session.user.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalProperties} propert{totalProperties !== 1 ? 'ies' : 'y'} · {occupied} occupied · {available} available
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
          <Link href="/landlord/properties/new"><Plus className="h-4 w-4" /> Add Property</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Properties', value: String(totalProperties), sub: `${available} available`, href: '/landlord/properties', tone: 'muted' },
          { label: 'Monthly Income', value: formatCurrency(totalRent, { compact: true }), sub: `${occupied} occupied`, href: '/landlord/rent', tone: occupied > 0 ? 'success' : 'muted' },
          { label: 'Pending Rent', value: String(pendingRentPayments.length), sub: overdueRent.length > 0 ? `${overdueRent.length} overdue` : 'None overdue', href: '/landlord/rent', tone: overdueRent.length > 0 ? 'destructive' : 'muted' },
          { label: 'Avg. Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—', sub: `${totalViews.toLocaleString('en-IN')} total views`, href: '/landlord/analytics', tone: 'muted' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-secondary-300 hover:shadow-md">
            <p className="font-display text-xl font-extrabold text-foreground">{stat.value}</p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={cn('text-xs', stat.tone === 'destructive' ? 'text-red-600' : stat.tone === 'success' ? 'text-secondary-600' : 'text-muted-foreground')}>{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pending booking requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Clock className="h-4 w-4 text-amber-500" /> Booking Requests ({pendingBookings.length})
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/landlord/tenants">All <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingBookings.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No pending requests</div>
            ) : (
              <div className="divide-y divide-border">
                {pendingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar className="h-9 w-9 rounded-lg">
                      {booking.tenant.avatar ? <AvatarImage src={booking.tenant.avatar} alt={booking.tenant.name ?? 'Tenant'} /> : null}
                      <AvatarFallback className="rounded-lg text-xs">{initials(booking.tenant.name ?? 'T')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{booking.tenant.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{booking.property.title}</p>
                    </div>
                    <LandlordBookingActions bookingId={booking.id} status={booking.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending rent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <IndianRupee className="h-4 w-4 text-primary-600" /> Pending Rent ({pendingRentPayments.length})
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/landlord/rent">All <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-secondary-500/60" />
                All rents collected 🎉
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingRentPayments.map((payment) => {
                  const meta = PAYMENT_STATUS_META[payment.status as PaymentStatus];
                  return (
                    <div key={payment.id} className="flex items-center gap-3 px-5 py-3.5">
                      <Avatar className="h-9 w-9 rounded-lg">
                        {payment.tenant.avatar ? <AvatarImage src={payment.tenant.avatar} alt={payment.tenant.name ?? ''} /> : null}
                        <AvatarFallback className="rounded-lg text-xs">{initials(payment.tenant.name ?? 'T')}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{payment.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{payment.property.title} · {payment.period}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                        <StatusBadge tone={meta.tone} label={meta.label} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Properties overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Building2 className="h-4 w-4 text-primary-600" /> Your Properties
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/landlord/properties">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {topProperties.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No properties listed yet</p>
              <Button asChild className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
                <Link href="/landlord/properties/new"><Plus className="h-4 w-4" /> Add your first property</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Property', 'Status', 'Rent', 'Occupancy', 'Rating', 'Requests', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground last:text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topProperties.map((prop) => {
                    const meta = PROPERTY_STATUS_META[prop.status as PropertyStatus];
                    const totalRooms = prop.totalRooms ?? 0;
                    const occupiedRooms = prop.occupiedRooms ?? 0;
                    const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
                    return (
                      <tr key={prop.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground line-clamp-1">{prop.title}</p>
                          <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge tone={meta.tone} label={meta.label} /></td>
                        <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(prop.rent ?? 0)}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <Progress
                              value={occupancyPct}
                              className="mb-1 h-1.5 w-24"
                              indicatorClassName={occupancyPct >= 80 ? 'bg-secondary-500' : occupancyPct >= 50 ? 'bg-amber-500' : 'bg-red-400'}
                            />
                            {occupiedRooms}/{totalRooms}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(prop.rating ?? 0) > 0 ? <span className="text-sm font-bold">⭐ {(prop.rating ?? 0).toFixed(1)}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {prop.bookings.length > 0 ? (
                            <Badge variant="warning" className="gap-1">{prop.bookings.length} pending</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button asChild variant="ghost" size="sm" className="h-7 rounded-lg px-2.5 text-xs">
                            <Link href={`/landlord/properties/${prop.id}`}>Manage</Link>
                          </Button>
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

      {/* Recent leads */}
      {recentLeads.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <MessageSquare className="h-4 w-4 text-secondary-600" /> Recent Leads
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/landlord/leads">View all <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.property?.title ?? 'General enquiry'} · {lead.source} · {timeAgo(lead.createdAt)}</p>
                  </div>
                  <Badge variant="muted" className="normal-case tracking-normal text-xs">{lead.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI tools prompt */}
      <Card className="overflow-hidden border-primary-200 bg-gradient-to-br from-primary-50 to-secondary-50 dark:border-primary-500/20 dark:from-primary-500/10 dark:to-secondary-500/10">
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <div>
              <p className="font-semibold text-foreground">AI Pricing &amp; Description Generator</p>
              <p className="text-sm text-muted-foreground">Get AI-suggested rent, auto-generate property descriptions and predict vacancy — all in seconds.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0 gap-1.5">
            <Link href="/landlord/properties"><Sparkles className="h-4 w-4" /> Try AI Tools</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
