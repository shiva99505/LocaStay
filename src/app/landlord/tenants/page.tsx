import { redirect } from 'next/navigation';
import { Users, Phone, MessageSquare, ShieldCheck, IndianRupee } from 'lucide-react';
import { LandlordBookingActions } from '@/components/landlord/booking-action-buttons';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { BOOKING_STATUS_META, type BookingStatus } from '@/lib/constants';
import { whatsappLink, telLink } from '@/lib/utils';

export const revalidate = 0;

export default async function LandlordTenantsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) redirect('/login');

  const bookings = await prisma.booking.findMany({
    where: { property: { landlordId: landlordProfile.id } },
    include: {
      tenant: { select: { id: true, name: true, phone: true, avatar: true, isVerified: true, profile: { select: { occupation: true } } } },
      property: { select: { title: true, city: true, rent: true } },
      payments: { where: { status: { in: ['PENDING', 'OVERDUE'] } }, select: { id: true, amount: true, status: true } },
    },
    orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
  });

  const active = bookings.filter((b) => b.status === 'APPROVED');
  const pending = bookings.filter((b) => b.status === 'PENDING');
  const past = bookings.filter((b) => ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(b.status));

  function TenantRow({ booking }: { booking: typeof bookings[number] }) {
    const meta = BOOKING_STATUS_META[booking.status as BookingStatus];
    return (
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 rounded-xl">
            {booking.tenant.avatar ? <AvatarImage src={booking.tenant.avatar} alt={booking.tenant.name ?? ''} /> : null}
            <AvatarFallback className="rounded-xl">{initials(booking.tenant.name ?? 'T')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">{booking.tenant.name}</p>
              {booking.tenant.isVerified && <Badge variant="success" className="gap-0.5 text-[10px] py-0"><ShieldCheck className="h-2.5 w-2.5" /> Verified</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{booking.property.title} · {booking.property.city}</p>
            {booking.tenant.profile?.occupation && (
              <p className="text-xs text-muted-foreground">{booking.tenant.profile.occupation}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {booking.status === 'APPROVED' && (
            <div className="text-right text-xs">
              <p className="font-bold text-foreground">{formatCurrency(booking.property.rent)}/mo</p>
              <p className="text-muted-foreground">Since {formatDate(booking.moveInDate)}</p>
            </div>
          )}
          {booking.payments.length > 0 && (
            <Badge variant="warning" className="gap-1"><IndianRupee className="h-2.5 w-2.5" /> {booking.payments.length} due</Badge>
          )}
          <StatusBadge tone={meta.tone} label={meta.label} />
          <LandlordBookingActions bookingId={booking.id} status={booking.status} />
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-2.5 text-xs">
            <a href={telLink(booking.tenant.phone)}><Phone className="h-3 w-3" /></a>
          </Button>
          <Button asChild size="sm" className="h-7 gap-1 rounded-lg bg-secondary-600 px-2.5 text-xs hover:bg-secondary-700">
            <a href={whatsappLink(booking.tenant.phone)} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-3 w-3" /></a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Tenants</h1>
        <p className="mt-1 text-sm text-muted-foreground">{active.length} active · {pending.length} pending · {past.length} past</p>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/30">
          <CardHeader><CardTitle className="text-base font-bold text-amber-700 dark:text-amber-400">Pending Requests ({pending.length})</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {pending.map((b) => <TenantRow key={b.id} booking={b} />)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base font-bold">Active Tenants ({active.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No active tenants. Accept a booking request to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">{active.map((b) => <TenantRow key={b.id} booking={b} />)}</div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base font-bold">Past / Completed ({past.length})</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {past.map((b) => <TenantRow key={b.id} booking={b} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
