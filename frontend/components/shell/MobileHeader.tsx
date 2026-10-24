import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Top bar for inner screens below lg: back arrow, title, optional subtitle and action. */
export function MobileHeader({
  title,
  subtitle,
  back = "/feed",
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-white px-2 py-2 lg:hidden">
      {back !== null && (
        <Link href={back} aria-label="Back" className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-sunken active:bg-sunken">
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className={back === null ? "min-w-0 flex-1 px-2" : "min-w-0 flex-1"}>
        <h1 className="truncate text-lg font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-ink">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1 pr-2">{action}</div>}
    </header>
  );
}
