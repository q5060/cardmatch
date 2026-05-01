export function AuthFormSkeleton() {
  return (
    <div
      className="card relative mx-auto max-w-sm space-y-5 overflow-hidden p-8"
      aria-busy
      aria-label="載入表單"
    >
      <div
        className="absolute left-0 right-0 top-0 h-1 skeleton-shimmer bg-gradient-to-r from-border via-muted-foreground/25 to-border"
        aria-hidden
      />
      <div className="skeleton-shimmer h-7 w-24 rounded-md bg-border" />
      <div className="space-y-2">
        <div className="skeleton-shimmer h-4 w-20 rounded bg-border" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg bg-border" />
      </div>
      <div className="space-y-2">
        <div className="skeleton-shimmer h-4 w-16 rounded bg-border" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg bg-border" />
      </div>
      <div className="skeleton-shimmer h-11 w-full rounded-lg bg-border" />
      <div className="skeleton-shimmer mx-auto h-4 w-40 rounded bg-border" />
    </div>
  );
}
