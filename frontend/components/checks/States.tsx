import { Skeleton } from "@/components/ui/skeleton";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** A failed load, said plainly, with a way to try again. */
export function ErrorState({ error, onRetry, className }: { error: Error; onRetry: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)} role="alert">
      <p className="font-semibold">Couldn&apos;t load this</p>
      <p className="max-w-sm text-sm text-muted-ink">{error.message}</p>
      <button onClick={onRetry} className={btn.secondary}>
        Retry
      </button>
    </div>
  );
}

/** An empty view is an invitation: say what's missing and offer the next step. */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-12 text-center", className)}>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-ink">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function RowsSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** First name for friendly copy, from the display name or the handle. */
export function firstName(p: { display_name: string | null; handle: string }) {
  return (p.display_name?.trim().split(/\s+/)[0] || p.handle) ?? "";
}
