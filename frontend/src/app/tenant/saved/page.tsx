import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { PropertyCard, type PropertyCardData } from '@/components/common/property-card';
import { fromJsonArray } from '@/lib/constants';

export const revalidate = 0;

export default async function SavedPropertiesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const supabase = await createClient();
  const { data: saved = [] } = await supabase
    .from('saved_properties')
    .select('*, property:properties(*)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const properties: PropertyCardData[] = (saved ?? []).map(({ property: p }: { property: Record<string, unknown> }) => ({
    id: p.id as string, title: p.title as string, type: p.type as string, rent: p.rent as number,
    village: p.village as string, city: p.city as string, state: p.state as string,
    coverImage: p.cover_image as string | null, images: fromJsonArray<string>(p.images as string | null),
    rating: p.rating as number, reviewCount: p.review_count as number,
    isVerified: p.is_verified as boolean, isFeatured: p.is_featured as boolean,
    totalRooms: p.total_rooms as number, occupiedRooms: p.occupied_rooms as number,
    nearestDistanceKm: [p.distance_to_school, p.distance_to_market, p.distance_to_bus_stand]
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
