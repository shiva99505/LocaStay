import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2, MapPin, Calendar, IndianRupee, ChevronRight,
  Clock, CheckCircle2, MessageSquare, ExternalLink,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { BOOKING_STATUS_META, type BookingStatus } from '@/lib/constants';
import { googleMapsViewUrl, whatsappLink } from '@/lib/utils';
import { CallLandlordButton } from '@/components/tenant/call-landlord-button';

export const revalidate = 0;

export default async function MyStayPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const [bookings, maintenanceRequests] = await Promise.all([
    prisma.booking.findMany({
      where: { tenantId: session.user.id },
      include: {
        property: {
          select: {
            id: true, title: true, address: true, city: true, state: true,
            latitude: true, longitude: true, coverImage: true,
            rent: true, deposit: true,
            landlord: { select: { user: { select: { name: true, phone: true } } } },
          },
        },
        payments: { select: { status: true, amount: true }, orderBy: { dueDate: 'desc' }, take: 3 },
      },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.maintenanceRequest.findMany({
      where: { tenantId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const active = bookings.find((b) => b.status === 'APPROVED');
  const pending = bookings.filter((b) => b.status === 'PENDING');
  const past = bookings.filter((b) => ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(b.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">My Stay</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your bookings, tenancy details and maintenance requests.</p>
      </div>

      {/* Active tenancy */}
      {active ? (
        <Card className="border-secondary-200 dark:border-secondary-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <CheckCircle2 className="h-4 w-4 text-secondary-600" /> Active Tenancy
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative h-36 w-full overflow-hidden rounded-xl bg-muted sm:h-32 sm:w-52 sm:shrink-0">
                {active.property.coverImage ? (
                  <img src={active.property.coverImage} alt={active.property.title} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="font-display text-lg font-bold text-foreground">{active.property.title}</h2>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {active.property.address}, {active.property.city}, {active.property.state}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Move-in: {formatDate(active.moveInDate)}
                </p>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <IndianRupee className="h-3.5 w-3.5" /> {formatCurrency(active.property.rent)}/month
                  <span className="font-normal text-muted-foreground">· Deposit: {formatCurrency(active.property.deposit)}</span>
                </p>
              </div>
            </div>

            {/* Landlord contact */}
            {active.property.landlord.user && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Landlord: {active.property.landlord.user.name}</span>
                <div className="ml-auto flex gap-2">
                  <CallLandlordButton
                    phone={active.property.landlord.user.phone ?? ''}
                    landlordName={active.property.landlord.user.name ?? 'Landlord'}
                  />
                  <Button asChild size="sm" className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
                    <a href={whatsappLink(active.property.landlord.user.phone, `Hi, I'm your tenant at ${active.property.title}`)} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Map link */}
            <a
              href={googleMapsViewUrl(active.property.latitude, active.property.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
            >
              <MapPin className="h-4 w-4" /> View on Google Maps <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Button asChild size="sm" className="gap-1.5">
              <Link href="/tenant/rent"><IndianRupee className="h-3.5 w-3.5" /> Rent Tracker</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-foreground">No active tenancy</p>
              <p className="mt-1 text-sm text-muted-foreground">Browse verified properties and submit a booking request to get started.</p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/properties"><MapPin className="h-4 w-4" /> Explore Properties</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending booking requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Clock className="h-4 w-4 text-amber-500" /> Pending Requests ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((booking) => (
              <div key={booking.id} className="flex items-center gap-4 rounded-xl border border-border p-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-sm text-foreground">{booking.property.title}</p>
                  <p className="text-xs text-muted-foreground">{booking.property.city}, {booking.property.state} · Move-in: {formatDate(booking.moveInDate)}</p>
                </div>
                <StatusBadge tone={BOOKING_STATUS_META['PENDING'].tone} label="Pending" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Maintenance requests */}
      {maintenanceRequests.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Recent Maintenance</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/tenant/complaints">View all <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {maintenanceRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', req.status === 'RESOLVED' ? 'bg-secondary-500' : req.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-red-500')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{req.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{req.category.toLowerCase().replace('_', ' ')} · {req.status.toLowerCase().replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past bookings */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Past Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.map((booking) => {
              const meta = BOOKING_STATUS_META[booking.status as BookingStatus];
              return (
                <div key={booking.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{booking.property.title}</p>
                    <p className="text-xs text-muted-foreground">{booking.property.city} · Requested {formatDate(booking.requestedAt)}</p>
                  </div>
                  <StatusBadge tone={meta.tone} label={meta.label} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
