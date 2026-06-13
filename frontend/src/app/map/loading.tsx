export default function MapLoading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="h-16 animate-pulse border-b border-border bg-muted/40" />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-96 animate-pulse bg-muted/30 lg:block" />
        <div className="flex-1 animate-pulse bg-muted/20" />
      </div>
    </div>
  );
}
