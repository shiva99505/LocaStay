import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PropertyCard, type PropertyCardData } from '@/components/common/property-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPropertiesWithCount } from '@/lib/data-access';
import { fromJsonArray, PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@/lib/constants';
import Link from 'next/link';
import { Search } from 'lucide-react';

export const revalidate = 60;

interface SearchParams {
  q?: string;
  type?: string;
  minRent?: string;
  maxRent?: string;
  state?: string;
  verified?: string;
  page?: string;
}

async function getProperties(params: SearchParams): Promise<{ properties: PropertyCardData[]; total: number }> {
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 12;

  const where = {
    status: { in: ['AVAILABLE', 'OCCUPIED'] as string[] },
    ...(params.type && params.type !== 'ANY' ? { type: params.type } : {}),
    ...(params.verified === '1' ? { isVerified: true } : {}),
    ...(params.state ? { state: { contains: params.state } } : {}),
    ...(params.q ? {
      OR: [
        { title: { contains: params.q, mode: 'insensitive' as const } },
        { city: { contains: params.q, mode: 'insensitive' as const } },
        { state: { contains: params.q, mode: 'insensitive' as const } },
        { village: { contains: params.q, mode: 'insensitive' as const } },
        { address: { contains: params.q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(params.minRent || params.maxRent ? {
      rent: {
        ...(params.minRent ? { gte: parseInt(params.minRent) } : {}),
        ...(params.maxRent ? { lte: parseInt(params.maxRent) } : {}),
      },
    } : {}),
  } as const;

  const { total, properties: raw } = await getPropertiesWithCount({ page, pageSize, where: where as Record<string, unknown> });

  const properties = raw.map((p) => ({
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

  return { properties, total };
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { properties, total } = await getProperties(params);
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 12;
  const totalPages = Math.ceil(total / pageSize);

  const activeFilters = [
    params.q && `"${params.q}"`,
    params.type && params.type !== 'ANY' && PROPERTY_TYPE_LABELS[params.type as keyof typeof PROPERTY_TYPE_LABELS],
    params.verified === '1' && 'Verified only',
    params.state && params.state,
    params.minRent && `From ₹${parseInt(params.minRent).toLocaleString('en-IN')}`,
    params.maxRent && `Up to ₹${parseInt(params.maxRent).toLocaleString('en-IN')}`,
  ].filter(Boolean);

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/30 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
              GPS-Verified Properties
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {total} listing{total !== 1 ? 's' : ''} across rural & semi-urban India
            </p>
            {activeFilters.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Active filters:</span>
                {activeFilters.map((f) => (
                  <Badge key={String(f)} variant="outline" className="normal-case tracking-normal">{f}</Badge>
                ))}
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                  <Link href="/properties">Clear all</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Type filter pills */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href={`/properties${params.q ? `?q=${params.q}` : ''}`}>
              <Badge variant={!params.type || params.type === 'ANY' ? 'default' : 'outline'} className="cursor-pointer normal-case tracking-normal hover:opacity-80">
                All types
              </Badge>
            </Link>
            {PROPERTY_TYPES.map((type) => {
              const searchP = new URLSearchParams({ ...(params.q ? { q: params.q } : {}), type });
              return (
                <Link key={type} href={`/properties?${searchP.toString()}`}>
                  <Badge variant={params.type === type ? 'default' : 'outline'} className="cursor-pointer normal-case tracking-normal hover:opacity-80">
                    {PROPERTY_TYPE_LABELS[type]}
                  </Badge>
                </Link>
              );
            })}
          </div>

          {properties.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-display text-lg font-bold text-foreground">No properties found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search terms or removing filters.</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/properties">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/properties?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}>← Previous</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/properties?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}>Next →</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
