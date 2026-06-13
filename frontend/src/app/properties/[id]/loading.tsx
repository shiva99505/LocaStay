export default function PropertyDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Image gallery skeleton */}
      <div className="relative bg-muted">
        <div className="mx-auto max-w-7xl">
          <div className="grid h-72 grid-cols-4 gap-1.5 overflow-hidden px-0 sm:h-80 lg:h-[420px]">
            <div className="col-span-2 row-span-2 animate-pulse bg-muted" />
            {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-muted/70" />)}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-muted" />)}
              </div>
              <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="w-full space-y-4 lg:w-80">
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
