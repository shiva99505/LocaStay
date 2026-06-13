import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { PropertyCard, type PropertyCardData } from '@/components/common/property-card';
import { fromJsonArray } from '@/lib/constants';

export const revalidate = 0;

export default async function SavedPropertiesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const saved = await prisma.savedProperty.findMany({
    where: { userId: session.user.id },
    include: { property: true },
    orderBy: { createdAt: 'desc' },
  });

  const properties: PropertyCardData[] = saved.map(({ property: p }) => ({
    id: p.id, title: p.title, type: p.type, rent: p.rent,
    village: p.village, city: p.city, state: p.state,
    coverImage: p.coverImage, images: fromJsonArray<string>(p.images),
    rating: p.rating, reviewCount: p.reviewCount,
    isVerified: p.isVerified, isFeatured: p.isFeatured,
    totalRooms: p.totalRooms, occupiedRooms: p.occupiedRooms,
    nearestDistanceKm: [p.distanceToSchool, p.distanceToMarket, p.distanceToBusStand]
      .filter((v): v is number => typeof v === 'number')
      .reduce((a, b) => Math.min(a, b), Infinity) || null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Saved Homes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'} saved</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/properties">Browse more</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-semibold text-foreground">No saved properties yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Hit the heart icon on any listing to save it here.</p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/properties">Explore properties</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
