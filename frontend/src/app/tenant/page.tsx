import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  IndianRupee, MapPin, Bell, Heart, ArrowRight,
  ShieldCheck, Clock, CheckCircle2, XCircle, Building2, ChevronRight,
  Wrench, CreditCard, Home,
} from 'lucide-react';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, timeAgo, initials, cn } from '@/lib/utils';

export const revalidate = 30;

async function getTenantData(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any;

  const [
    { data: profile },
    { data: activeBookingRaw },
    { count: pendingBookings },
    { data: notifications },
    { count: savedCount },
    { data: recommended },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).single(),

    // Flat query — no FK joins
    admin
      .from('bookings')
      .select('id, status, property_id, requested_at')
      .eq('tenant_id', userId)
      .eq('status', 'APPROVED')
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    admin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', userId).eq('status', 'PENDING'),

    admin.from('notifications').select('id,title,message,created_at,link').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }).limit(5),

    admin.from('saved_properties').select('id', { count: 'exact', head: true }).eq('user_id', userId),

    admin.from('properties')
      .select('id,title,type,rent,village,city,state,cover_image,rating,review_count,is_verified,is_featured,total_rooms,occupied_rooms,status')
      .in('status', ['AVAILABLE'])
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .limit(4),
  ]);

  // Fetch property and rent payments for the active booking separately
  let activeProperty: any = null;
  let latestPayment: any  = null;

  if (activeBookingRaw?.property_id) {
    const [{ data: prop }, { data: payments }] = await Promise.all([
      admin.from('properties').select('id,title,address,city,state,cover_image').eq('id', activeBookingRaw.property_id).single(),
      admin.from('rent_payments')
        .select('id,period,amount,late_fee,due_date,status,paid_date')
        .eq('tenant_id', userId)
        .eq('property_id', activeBookingRaw.property_id)
        .order('due_date', { ascending: true })
        .limit(10),
    ]);
    activeProperty = prop ?? null;

    // Find the next unpaid payment (PENDING or OVERDUE), else the most recent
    const unpaid = (payments ?? []).filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE');
    latestPayment = unpaid.length > 0 ? unpaid[0] : ((payments ?? []).at(-1) ?? null);
  }

  const activeBooking = activeBookingRaw
    ? { ...activeBookingRaw, property: activeProperty }
    : null;

  return {
    profile,
    activeBooking,
    latestPayment,
    pendingBookings: pendingBookings ?? 0,
    notifications:   notifications   ?? [],
    savedCount:      savedCount      ?? 0,
    recommended:     recommended     ?? [],
  };
}

type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'FAILED' | 'REFUNDED';

const paymentStatusIcon = {
  PAID:     <CheckCircle2 className="h-4 w-4 text-secondary-600" />,
  PENDING:  <Clock        className="h-4 w-4 text-amber-500" />,
  OVERDUE:  <XCircle      className="h-4 w-4 text-destructive" />,
  FAILED:   <XCircle      className="h-4 w-4 text-destructive" />,
  REFUNDED: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
};

export default async function TenantDashboard() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { profile, activeBooking, latestPayment, pendingBookings, notifications, savedCount, recommended } =
    await getTenantData(authUser.id);

  if (!profile) redirect('/login');
  if ((profile as any).role !== 'TENANT') redirect('/landlord');

  const property      = (activeBooking as any)?.property ?? null;
  const paymentStatus = (latestPayment?.status ?? null) as PaymentStatus | null;
  const rentDue       = paymentStatus === 'PENDING' || paymentStatus === 'OVERDUE';

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-2xl border-2 border-border">
            {(profile as any).avatar
              ? <AvatarImage src={(profile as any).avatar} alt={(profile as any).name} />
              : null}
            <AvatarFallback className="rounded-2xl text-lg">{initials((profile as any).name ?? 'T')}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">
              Welcome back, {(profile as any).name?.split(' ')[0]}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {property
                ? `Staying at ${property.city}`
                : 'Find your perfect home today'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rentDue && (
            <Link href="/tenant/rent">
              <Badge variant="destructive" className="cursor-pointer gap-1.5 hover:opacity-80">
                <IndianRupee className="h-3 w-3" /> Rent {paymentStatus === 'OVERDUE' ? 'Overdue' : 'Due'}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          href="/tenant/stay"
          icon={<Home className="h-5 w-5" />}
          label="Active Stay"
          value={property?.city ?? '—'}
          sub={property ? 'Tenancy active' : 'No active tenancy'}
          tone={property ? 'success' : 'muted'}
        />
        <StatCard
          href="/tenant/rent"
          icon={<IndianRupee className="h-5 w-5" />}
          label="Rent Status"
          value={latestPayment ? formatCurrency(latestPayment.amount) : '—'}
          sub={paymentStatus ?? 'No payments'}
          tone={paymentStatus === 'PAID' ? 'success' : paymentStatus === 'OVERDUE' ? 'destructive' : 'warning'}
        />
        <StatCard
          href="/tenant/saved"
          icon={<Heart className="h-5 w-5" />}
          label="Saved Homes"
          value={String(savedCount)}
          sub={savedCount === 1 ? '1 property saved' : `${savedCount} properties`}
          tone="muted"
        />
        <StatCard
          href="/tenant/notifications"
          icon={<Bell className="h-5 w-5" />}
          label="Notifications"
          value={String((notifications as any[]).length)}
          sub={(notifications as any[]).length === 0 ? 'All caught up' : `${(notifications as any[]).length} unread`}
          tone={(notifications as any[]).length > 0 ? 'warning' : 'muted'}
        />
      </div>

      {/* Active tenancy card */}
      {property ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">Current Stay</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Link href="/tenant/stay">View full details <ChevronRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative h-28 w-full overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-40 sm:shrink-0">
                {property.cover_image ? (
                  <Image
                    src={property.cover_image}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 160px"
                  />
                ) : (
                  <Building2 className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="font-display text-base font-bold text-foreground">{property.title}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {[property.address, property.city, property.state].filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                {latestPayment && (
                  <div className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold',
                    paymentStatus === 'PAID'
                      ? 'bg-secondary-50 text-secondary-800 dark:bg-secondary-500/10 dark:text-secondary-300'
                      : paymentStatus === 'OVERDUE'
                      ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
                  )}>
                    {paymentStatus ? paymentStatusIcon[paymentStatus] : null}
                    {formatCurrency(latestPayment.amount)} — {paymentStatus}
                  </div>
                )}
                {rentDue && (
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href="/tenant/rent"><CreditCard className="h-3.5 w-3.5" /> Pay Now</Link>
                  </Button>
                )}
                {!latestPayment && (
                  <span className="text-xs text-muted-foreground">Rent tracker not set up yet</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-500/10">
              <Building2 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">No active tenancy</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse available verified homes and submit a booking request to get started.
              </p>
            </div>
            <Button asChild size="lg" className="gap-2 shadow-glow-primary">
              <Link href="/properties"><MapPin className="h-4 w-4" /> Explore properties</Link>
            </Button>
            {(pendingBookings as number) > 0 && (
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Link href="/tenant/stay">
                  <Clock className="h-4 w-4" /> {pendingBookings} pending booking request{(pendingBookings as number) > 1 ? 's' : ''}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { href: '/tenant/rent',       icon: IndianRupee, label: rentDue ? 'Pay Rent' : 'Rent History', urgent: rentDue },
          { href: '/tenant/map',        icon: MapPin,      label: 'Map My Stay',                          urgent: false },
          { href: '/tenant/support',    icon: Wrench,      label: 'Raise Issue',                          urgent: false },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md',
              action.urgent
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                : 'border-border bg-card text-foreground hover:border-primary-300',
            )}
          >
            <span className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              action.urgent ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-primary-50 dark:bg-primary-500/10',
            )}>
              <action.icon className={cn('h-5 w-5', action.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-primary-700 dark:text-primary-400')} />
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      {/* Notifications */}
      {(notifications as any[]).length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Bell className="h-4 w-4 text-primary-600" /> Recent Notifications
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/tenant/notifications">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            {(notifications as any[]).map((notif, idx) => (
              <div key={notif.id} className={cn('flex gap-3 py-3', idx < (notifications as any[]).length - 1 && 'border-b border-border')}>
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary-600 dark:bg-primary-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{notif.message}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(notif.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommended properties */}
      {(recommended as any[]).length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Recommended for you</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Link href="/properties">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(recommended as any[]).map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-40 overflow-hidden bg-muted">
                  {p.cover_image
                    ? <Image src={p.cover_image} alt={p.title} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
                    : <Building2 className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/40" />}
                  {p.is_verified && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground"><MapPin className="inline h-3 w-3" /> {p.city}, {p.state}</p>
                  <p className="mt-2 text-base font-bold">{formatCurrency(p.rent)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ href, icon, label, value, sub, tone }: {
  href: string; icon: React.ReactNode; label: string; value: string; sub: string;
  tone: 'success' | 'warning' | 'destructive' | 'muted';
}) {
  const toneClass = {
    success:     'bg-secondary-50 text-secondary-700 dark:bg-secondary-500/10 dark:text-secondary-300',
    warning:     'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    destructive: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    muted:       'bg-muted text-muted-foreground',
  }[tone];

  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}>
        {icon}
      </div>
      <div>
        <p className="font-display text-xl font-extrabold text-foreground leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </div>
    </Link>
  );
}
