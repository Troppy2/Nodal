import { Skeleton } from "@/components/ui/skeleton";

/** Shown instantly on every navigation while the next route loads. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[920px] px-4 py-6 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-48 rounded-md" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full rounded-md" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line">
            <Skeleton className="aspect-[2/1] rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-2/3 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
