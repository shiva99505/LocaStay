import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft, Building2, MapPin, IndianRupee, Users,
  Clock, CheckCircle2, Eye,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PROPERTY_STATUS_META, BOOKING_STATUS_META, type PropertyStatus, type BookingStatus } from '@/lib/constants';
import { PropertyEditForm } from '@/components/landlord/property-edit-form';
import { DeletePropertyButton } from '@/components/landlord/delete-property-button';
import { DelistPropertyButton } from '@/components/landlord/delist-property-button';

export const revalidate = 0;

export default async function PropertyManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      landlord: { select: { userId: true } },
      amenities: { select: { label: true } },
      bookings: {
        include: { tenant: { select: { name: true, phone: true } } },
        orderBy: { requestedAt: 'desc' },
        take: 10,
      },
      _count: { select: { bookings: true, reviews: true } },
    },
  });

  if (!property) notFound();
  if (property.landlord.userId !== session.user.id) redirect('/landlord/properties');

  const statusMeta = PROPERTY_STATUS_META[property.status as PropertyStatus];
  const pendingBookings = property.bookings.filter((b) => b.status === 'PENDING');
  const approvedBookings = property.bookings.filter((b) => b.status === 'APPROVED');

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <DeletePropertyButton propertyId={property.id} propertyTitle={property.title} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: IndianRupee, label: 'Rent', value: formatCurrency(property.rent) + '/mo', color: 'text-secondary-600' },
          { icon: IndianRupee, label: 'Deposit', value: formatCurrency(property.deposit), color: 'text-foreground' },
          { icon: Users, label: 'Occupancy', value: `${property.occupiedRooms}/${property.totalRooms} rooms`, color: 'text-primary-600' },
          { icon: Clock, label: 'Requests', value: `${pendingBookings.length} pending`, color: pendingBookings.length > 0 ? 'text-amber-600' : 'text-muted-foreground' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className={`h-4 w-4 ${color} mb-2`} />
            <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="h-4 w-4 text-primary-600" /> Edit Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyEditForm
              propertyId={property.id}
              initial={{
                title: property.title,
                type: property.type,
                description: property.description,
                rent: property.rent,
                deposit: property.deposit,
                totalRooms: property.totalRooms,
                availableFrom: (property.availableFrom ?? new Date()).toISOString(),
                address: property.address,
                village: property.village,
                city: property.city,
                state: property.state,
                pincode: property.pincode,
              }}
            />
          </CardContent>
        </Card>

        {/* Bookings panel */}
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
                  {pendingBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{b.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">Move-in: {formatDate(b.moveInDate)}</p>
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
                  {approvedBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{b.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">Since {formatDate(b.moveInDate)}</p>
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

          {/* Amenities */}
          {property.amenities.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {property.amenities.map((a) => (
                    <span key={a.label} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{a.label}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
