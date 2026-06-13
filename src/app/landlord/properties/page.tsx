import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Building2, Eye, Star, ShieldCheck, MapPin } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { PROPERTY_STATUS_META, type PropertyStatus } from '@/lib/constants';
import { DeletePropertyButton } from '@/components/landlord/delete-property-button';

export const revalidate = 0;

export default async function LandlordPropertiesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) redirect('/login');

  const properties = await prisma.property.findMany({
    where: { landlordId: landlordProfile.id },
    include: {
      amenities: { select: { label: true }, take: 4 },
      _count: { select: { bookings: true, reviews: true } },
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });

  const stats = {
    total: properties.length,
    available: properties.filter((p) => p.status === 'AVAILABLE').length,
    occupied: properties.filter((p) => p.status === 'OCCUPIED').length,
    pending: properties.filter((p) => p.status === 'PENDING').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">My Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.total} total · {stats.available} available · {stats.occupied} occupied
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
          <Link href="/landlord/properties/new"><Plus className="h-4 w-4" /> Add Property</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Available', value: stats.available, color: 'text-secondary-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-primary-600' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={cn('font-display text-2xl font-extrabold', s.color)}>{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {properties.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-foreground">No properties yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first property and reach tenants across India.</p>
            </div>
            <Button asChild className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
              <Link href="/landlord/properties/new"><Plus className="h-4 w-4" /> Add first property</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((prop) => {
            const meta = PROPERTY_STATUS_META[prop.status as PropertyStatus];
            const occupancyPct = prop.totalRooms > 0 ? Math.round((prop.occupiedRooms / prop.totalRooms) * 100) : 0;
            return (
              <div key={prop.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:border-secondary-300 hover:shadow-md">
                <div className="relative h-40 overflow-hidden bg-muted">
                  {prop.coverImage ? (
                    <img src={prop.coverImage} alt={prop.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <Building2 className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground/30" />
                  )}
                  <div className="absolute inset-x-2 top-2 flex items-center gap-1.5">
                    <StatusBadge tone={meta.tone} label={meta.label} />
                    {prop.isVerified && <Badge variant="success" className="gap-1 text-[10px]"><ShieldCheck className="h-2.5 w-2.5" /></Badge>}
                    {prop.isFeatured && <Badge variant="warning" className="text-[10px]">★</Badge>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-display text-base font-bold text-foreground line-clamp-1">{prop.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {prop.city}, {prop.state}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-foreground">{formatCurrency(prop.rent)}/mo</span>
                    {prop.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {prop.rating.toFixed(1)} ({prop._count.reviews})</span>
                    )}
                  </div>
                  <div className="mt-1">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Occupancy</span><span>{prop.occupiedRooms}/{prop.totalRooms} rooms</span>
                    </div>
                    <Progress value={occupancyPct} className="h-1.5" />
                  </div>
                  {prop.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prop.amenities.map((a) => <span key={a.label} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{a.label}</span>)}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                      <Link href={`/properties/${prop.id}`}><Eye className="mr-1 h-3 w-3" /> Preview</Link>
                    </Button>
                    <DeletePropertyButton propertyId={prop.id} propertyTitle={prop.title} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
