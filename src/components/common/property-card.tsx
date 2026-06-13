import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, ShieldCheck, BedDouble, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/constants';
import { cn, formatCurrency, formatDistanceKm } from '@/lib/utils';

export interface PropertyCardData {
  id: string;
  title: string;
  type: string;
  rent: number;
  village?: string | null;
  city: string;
  state: string;
  coverImage?: string | null;
  images?: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isFeatured?: boolean;
  totalRooms: number;
  occupiedRooms: number;
  nearestDistanceKm?: number | null;
}

export function PropertyCard({ property, className }: { property: PropertyCardData; className?: string }) {
  const image = property.coverImage ?? property.images?.[0];
  const vacancies = Math.max(property.totalRooms - property.occupiedRooms, 0);
  const typeLabel = PROPERTY_TYPE_LABELS[property.type as PropertyType] ?? property.type;
  const place = [property.village, property.city].filter(Boolean).join(', ');

  return (
    <Link
      href={`/properties/${property.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <BedDouble className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="brand">{typeLabel}</Badge>
          {property.isVerified && (
            <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
          )}
          {property.isFeatured && (
            <Badge variant="warning" className="gap-1"><Sparkles className="h-3 w-3" /> Featured</Badge>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <Badge variant={vacancies > 0 ? 'info' : 'muted'} className="normal-case tracking-normal">
            {vacancies > 0 ? `${vacancies} room${vacancies > 1 ? 's' : ''} vacant` : 'Fully occupied'}
          </Badge>
          {property.rating > 0 && (
            <Badge variant="outline" className="gap-1 border-none bg-background/85 normal-case tracking-normal text-foreground backdrop-blur">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {property.rating.toFixed(1)}
              <span className="text-muted-foreground">({property.reviewCount})</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-1 font-display text-base font-bold text-foreground transition-colors group-hover:text-primary-700 dark:group-hover:text-primary-300">
          {property.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{place}, {property.state}</span>
        </p>

        {property.nearestDistanceKm != null && (
          <p className="text-xs font-medium text-secondary-700 dark:text-secondary-400">
            {formatDistanceKm(property.nearestDistanceKm)} from key landmarks
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-1.5">
          <div>
            <p className="font-display text-lg font-extrabold text-foreground">
              {formatCurrency(property.rent)}
              <span className="text-xs font-medium text-muted-foreground">/month</span>
            </p>
            <p className="text-xs text-muted-foreground">Deposit applies · GPS-verified location</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-primary-700 transition-colors group-hover:border-primary-400 group-hover:bg-primary-50 dark:text-primary-300 dark:group-hover:bg-primary-500/10">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
