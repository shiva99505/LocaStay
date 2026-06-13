import { PropertyCardSkeleton } from '@/components/common/property-card';

export default function PropertiesLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-muted" />)}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
