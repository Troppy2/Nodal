import { cn } from "@/lib/utils";

/** The node mark: two nodes joined by an edge. Also the app icon (app/icon.svg). */
export function NodalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <line x1="6" y1="18" x2="18" y2="6" stroke="#101c26" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="5.5" cy="18.5" r="3.6" fill="#0f766e" />
      <circle cx="18.5" cy="5.5" r="3.6" fill="#101c26" />
    </svg>
  );
}

/** Wordmark: the node mark beside "Nodal". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3 text-[22px] font-extrabold tracking-[-0.03em] text-ink", className)}>
      <NodalMark />
      Nodal
    </span>
  );
}
