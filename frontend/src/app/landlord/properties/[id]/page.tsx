import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft, Building2, MapPin, IndianRupee, Users,
  Clock, CheckCircle2, Eye, EyeOff,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PROPERTY_STATUS_META, BOOKING_STATUS_META, type PropertyStatus, type BookingStatus } from '@/lib/constants';
import { DelistPropertyButton } from '@/components/landlord/delist-property-button';

export const revalidate = 0;

export default async function PropertyManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const supabase = await createClient();

  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) redirect('/login');

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('landlord_id', landlordProfile.id)
    .single();

  if (!property) notFound();

  const { data: bookings = [] } = await supabase
    .from('bookings')
    .select('id, status, move_in_date, tenant:profiles!tenant_id(name, phone)')
    .eq('property_id', id)
    .order('requested_at', { ascending: false })
    .limit(10);

  const statusMeta = PROPERTY_STATUS_META[property.status as PropertyStatus];
  const pendingBookings = (bookings ?? []).filter((b: any) => b.status === 'PENDING');
  const approvedBookings = (bookings ?? []).filter((b: any) => b.status === 'APPROVED');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/landlord/properties"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-foreground">{property.title}</h1>
            <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {property.address}, {property.city}, {property.state}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Link>
          </Button>
          {(property.status === 'AVAILABLE' || property.status === 'DELISTED') && (
            <DelistPropertyButton
              propertyId={property.id}
              propertyTitle={property.title}
              currentStatus={property.status}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: IndianRupee, label: 'Rent', value: `${formatCurrency(property.rent)}/mo`, color: 'text-secondary-600' },
          { icon: IndianRupee, label: 'Deposit', value: formatCurrency(property.deposit ?? 0), color: 'text-foreground' },
          { icon: Users,       label: 'Occupancy', value: `${property.occupied_rooms ?? 0}/${property.total_rooms ?? 1} rooms`, color: 'text-primary-600' },
          { icon: Clock,       label: 'Requests', value: `${pendingBookings.length} pending`, color: pendingBookings.length > 0 ? 'text-amber-600' : 'text-muted-foreground' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className={`h-4 w-4 ${color} mb-2`} />
            <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Status notice */}
      {property.status === 'DELISTED' && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Hidden from listings</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">
                This property is not visible to tenants. Click &ldquo;Publish Listing&rdquo; above to make it live again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {property.status === 'PENDING' && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Awaiting admin approval</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Your property is under review. It will go live once approved by LocaStay admin.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Building2 className="h-4 w-4 text-primary-600" /> Property Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Type', value: property.type?.replace('_', ' ') },
              { label: 'Rent', value: `${formatCurrency(property.rent)}/month` },
              { label: 'Deposit', value: formatCurrency(property.deposit ?? 0) },
              { label: 'Total Rooms', value: property.total_rooms ?? 1 },
              { label: 'City', value: property.city },
              { label: 'State', value: property.state },
              { label: 'Pincode', value: property.pincode },
              { label: 'Available From', value: property.available_from ? formatDate(property.available_from) : 'Immediately' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{value ?? '—'}</p>
              </div>
            ))}
          </div>
          {property.description && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-0.5 text-sm text-foreground">{property.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      <div className="space-y-4">
        {pendingBookings.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4" /> Pending Requests ({pendingBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {pendingBookings.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{b.tenant?.name ?? 'Tenant'}</p>
                      <p className="text-xs text-muted-foreground">Move-in: {formatDate(b.move_in_date)}</p>
                    </div>
                    <Badge variant="warning" className="text-[10px]">Pending</Badge>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3">
                <Button asChild variant="outline" size="sm" className="w-full text-xs">
                  <Link href="/landlord/tenants">Manage All Requests</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {approvedBookings.length > 0 && (
          <Card className="border-secondary-200 dark:border-secondary-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-secondary-700 dark:text-secondary-400">
                <CheckCircle2 className="h-4 w-4" /> Active Tenants ({approvedBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {approvedBookings.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{b.tenant?.name ?? 'Tenant'}</p>
                      <p className="text-xs text-muted-foreground">Since {formatDate(b.move_in_date)}</p>
                    </div>
                    <StatusBadge tone={BOOKING_STATUS_META['APPROVED' as BookingStatus].tone} label="Active" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pendingBookings.length === 0 && approvedBookings.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No booking requests yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
