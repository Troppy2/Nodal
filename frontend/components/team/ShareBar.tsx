import { cn } from "@/lib/utils";

/** Segmented revenue bar. Segments are basis points, colored by each member's discipline. */
export function ShareBar({ segments, className }: { segments: { bps: number; color: string; label: string }[]; className?: string }) {
  return (
    <div
      className={cn("flex h-2 gap-0.5 overflow-hidden rounded-full bg-sunken", className)}
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.bps / 100}%`).join(", ")}
    >
      {segments
        .filter((s) => s.bps > 0)
        .map((s) => (
          <div key={s.label} className="transition-[width]" style={{ width: `${Math.min(s.bps, 10000) / 100}%`, background: s.color }} />
        ))}
    </div>
  );
}

export function ShareTotal({ bps }: { bps: number }) {
  return (
    <span aria-live="polite" className={cn("text-xs", bps === 10000 ? "text-muted-ink" : "text-cool")}>
      Total {bps / 100}%{bps !== 10000 && (bps > 10000 ? " · over" : " · under")}
    </span>
  );
}
