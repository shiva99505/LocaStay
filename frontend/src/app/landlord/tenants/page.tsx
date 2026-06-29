import { redirect } from 'next/navigation';
import { Users, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { BOOKING_STATUS_META, type BookingStatus } from '@/lib/constants';
import { TenantDetailsMenu, type BookingDetailData } from '@/components/landlord/tenant-details-menu';

export const revalidate = 0;

export default async function LandlordTenantsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const { getAdminClient } = await import('@/lib/supabase/admin');
  const admin = getAdminClient() as any;

  const { data: lpRows } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1);
  const landlordProfile = (lpRows as Array<{ id: string }> | null)?.[0] ?? null;
  if (!landlordProfile) redirect('/login');

  const { data: ownedProperties } = await admin
    .from('properties')
    .select('id')
    .eq('landlord_id', landlordProfile.id);

  const propertyIds = (ownedProperties ?? []).map((p: { id: string }) => p.id);

  // No FK constraints from bookings→profiles in this schema, so fetch separately
  const { data: rawBookings = [] } = propertyIds.length === 0
    ? { data: [] }
    : await admin
        .from('bookings')
        .select('*')
        .in('property_id', propertyIds)
        .order('status', { ascending: true })
        .order('requested_at', { ascending: false });

  const tenantIds = [...new Set((rawBookings ?? []).map((b: any) => b.tenant_id as string))];
  const bookingPropIds = [...new Set((rawBookings ?? []).map((b: any) => b.property_id as string))];
  const bookingIds = (rawBookings ?? []).map((b: any) => b.id as string);

  const [
    { data: tenantRows = [] },
    { data: propRows = [] },
    { data: agreementRows = [] },
    { data: rentPayRows = [] },
  ] = await Promise.all([
    tenantIds.length
      ? admin.from('profiles').select('id, name, phone, avatar, is_verified').in('id', tenantIds)
      : Promise.resolve({ data: [] }),
    bookingPropIds.length
      ? admin.from('properties').select('id, title, city').in('id', bookingPropIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length
      ? admin.from('agreements').select('booking_id, status, rent_amount, start_date').in('booking_id', bookingIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length
      ? admin.from('rent_payments').select('booking_id').in('booking_id', bookingIds).limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  const tenantMap = Object.fromEntries((tenantRows ?? []).map((t: any) => [t.id, t]));
  const propMap   = Object.fromEntries((propRows   ?? []).map((p: any) => [p.id, p]));
  const agreeMap  = Object.fromEntries((agreementRows ?? []).filter((a: any) => a.booking_id).map((a: any) => [a.booking_id, a]));
  const trackerSet = new Set((rentPayRows ?? []).map((r: any) => r.booking_id as string));

  const bookings = (rawBookings ?? []).map((b: any) => ({
    ...b,
    tenant:         tenantMap[b.tenant_id]   ?? null,
    property:       propMap[b.property_id]   ?? null,
    agreement:      agreeMap[b.id]           ?? null,
    hasRentTracker: trackerSet.has(b.id),
  })).filter((b: any) => b.tenant && b.property);

  const active = (bookings ?? []).filter((b: any) => b.status === 'APPROVED');
  const pending = (bookings ?? []).filter((b: any) => b.status === 'PENDING');
  const past = (bookings ?? []).filter((b: any) =>
    ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(b.status),
  );

  function TenantRow({ booking }: { booking: BookingDetailData }) {
    const meta = BOOKING_STATUS_META[booking.status as BookingStatus];
    return (
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 rounded-xl">
            {booking.tenant.avatar
              ? <AvatarImage src={booking.tenant.avatar} alt={booking.tenant.name ?? ''} />
              : null}
            <AvatarFallback className="rounded-xl">{initials(booking.tenant.name ?? 'T')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">{booking.tenant.name}</p>
              {booking.tenant.is_verified && (
                <Badge variant="success" className="gap-0.5 text-[10px] py-0">
                  <ShieldCheck className="h-2.5 w-2.5" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {booking.property.title} · {booking.property.city}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {booking.agreement && (
            <div className="text-right text-xs">
              <p className="font-bold text-foreground">
                {formatCurrency(booking.agreement.rent_amount)}/mo
              </p>
              <p className="text-muted-foreground">Since {formatDate(booking.agreement.start_date)}</p>
            </div>
          )}
          {booking.status === 'APPROVED' && (
            <Badge
              variant={booking.hasRentTracker ? 'success' : 'warning'}
              className="text-[10px] py-0"
            >
              {booking.hasRentTracker ? 'Tracker Active' : 'Setup Rent'}
            </Badge>
          )}
          <StatusBadge tone={meta.tone} label={meta.label} />
          <TenantDetailsMenu booking={booking} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Tenants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active.length} active · {pending.length} pending · {past.length} past
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base font-bold text-amber-700 dark:text-amber-400">
              Pending Requests ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {pending.map((b: any) => <TenantRow key={b.id} booking={b} />)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Active Tenants ({active.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No active tenants. Accept a booking request to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {active.map((b: any) => <TenantRow key={b.id} booking={b} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Past / Completed ({past.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {past.map((b: any) => <TenantRow key={b.id} booking={b} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
