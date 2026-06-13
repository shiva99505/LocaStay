import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { PropertyMap, type MapProperty } from '@/components/maps/property-map';

export const revalidate = 0;

export default async function MapMyStayPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const [activeBooking, nearbyProperties] = await Promise.all([
    prisma.booking.findFirst({
      where: { tenantId: session.user.id, status: 'APPROVED' },
      include: { property: { select: { latitude: true, longitude: true, city: true, state: true } } },
    }),
    prisma.property.findMany({
      where: { status: { in: ['AVAILABLE', 'OCCUPIED'] } },
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }],
      take: 30,
      select: { id: true, title: true, city: true, state: true, rent: true, latitude: true, longitude: true, isVerified: true, status: true },
    }),
  ]);

  const mapProperties: MapProperty[] = nearbyProperties;
  const userCenter = activeBooking?.property
    ? { lat: activeBooking.property.latitude, lng: activeBooking.property.longitude }
    : undefined;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4 lg:h-[calc(100dvh-4rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Map My Stay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeBooking
              ? `Showing properties near your stay in ${activeBooking.property.city}`
              : `${mapProperties.length} GPS-verified listings on the map`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/properties"><Search className="h-4 w-4" /> Explore listings</Link>
        </Button>
      </div>

      <div className="relative flex flex-1 overflow-hidden rounded-2xl border border-border">
        {/* Map panel */}
        <div className="relative flex-1 overflow-hidden">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <PropertyMap
            properties={mapProperties}
            center={userCenter}
            zoom={userCenter ? 13 : 6}
            className="h-full w-full"
          />
          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 rounded-xl border border-border bg-card/90 p-3 text-xs backdrop-blur">
            <p className="font-bold text-foreground">Legend</p>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-secondary-600 border-2 border-white" /> Available · Verified</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-primary-600 border-2 border-white" /> Available · Unverified</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-gray-400 border-2 border-white" /> Occupied</span>
            {userCenter && <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-red-600 border-2 border-white" /> Your stay</span>}
          </div>
        </div>

        {/* Sidebar list */}
        <div className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-card xl:block">
          <div className="sticky top-0 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{mapProperties.length} properties</p>
          </div>
          <div className="divide-y divide-border">
            {mapProperties.map((prop) => (
              <Link
                key={prop.id}
                href={`/properties/${prop.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{prop.title}</p>
                  <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                  <p className="mt-0.5 text-xs font-bold text-primary-700 dark:text-primary-300">{formatCurrency(prop.rent)}/mo</p>
                </div>
                {prop.isVerified && <Badge variant="success" className="mt-0.5 shrink-0 text-[10px] py-0.5 px-1.5">✓</Badge>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
