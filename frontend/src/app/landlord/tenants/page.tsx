import { redirect } from 'next/navigation';
import { Users, Phone, MessageSquare, ShieldCheck, IndianRupee } from 'lucide-react';
import { LandlordBookingActions } from '@/components/landlord/booking-action-buttons';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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

  const supabase = await createClient();
  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) redirect('/login');

  // Step 1: get property IDs belonging to this landlord
  const { data: ownedProperties } = await supabase
    .from('properties')
    .select('id')
    .eq('landlord_id', landlordProfile.id);

  const propertyIds = (ownedProperties ?? []).map((p) => p.id);

  // Step 2: fetch bookings for those properties
  const { data: bookings = [] } = propertyIds.length === 0
    ? { data: [] }
    : await supabase
        .from('bookings')
        .select(`
          *,
          tenant:profiles!tenant_id(id, name, phone, avatar, is_verified, occupation),
          property:properties!property_id(title, city),
          agreement:agreements!booking_id(status, rent_amount, start_date),
          payments:rent_payments!booking_id(id, amount, status)
        `)
        .in('property_id', propertyIds)
        .order('status', { ascending: true })
        .order('requested_at', { ascending: false });

  const active = (bookings ?? []).filter((b) => b.status === 'APPROVED');
  const pending = (bookings ?? []).filter((b) => b.status === 'PENDING');
  const past = (bookings ?? []).filter((b) => ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(b.status));

  function TenantRow({ booking }: { booking: NonNullable<typeof bookings>[number] }) {
    const meta = BOOKING_STATUS_META[booking.status as BookingStatus];
    const duePays = (booking.payments ?? []).filter((p: { status: string }) => p.status === 'PENDING' || p.status === 'OVERDUE');
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
              {booking.tenant.is_verified && <Badge variant="success" className="gap-0.5 text-[10px] py-0"><ShieldCheck className="h-2.5 w-2.5" /> Verified</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{booking.property.title} · {booking.property.city}</p>
            {booking.tenant.occupation && (
              <p className="text-xs text-muted-foreground">{booking.tenant.occupation}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {booking.agreement && (
            <div className="text-right text-xs">
              <p className="font-bold text-foreground">{formatCurrency(booking.agreement.rent_amount)}/mo</p>
              <p className="text-muted-foreground">Since {formatDate(booking.agreement.start_date)}</p>
            </div>
          )}
          {duePays.length > 0 && (
            <Badge variant="warning" className="gap-1"><IndianRupee className="h-2.5 w-2.5" /> {duePays.length} due</Badge>
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
