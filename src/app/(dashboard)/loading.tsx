import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly when switching between dashboard sections, while the
 * server renders the new page. Without it the click gives no feedback until
 * every query on the next page has finished, so the menu feels frozen.
 * It is prefetched together with the sidebar links, so it costs no request.
 */
export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>

      <Skeleton className="h-72" />
    </div>
  );
}
