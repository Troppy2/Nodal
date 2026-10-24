import { cn } from "@/lib/utils";

/** Member colors, in order. Shares are not tied to a discipline, so they cycle through the palette. */
export const SHARE_COLORS = ["#0f766e", "#8a5a00", "#be185d", "#1f4fd8", "#5b6b78"];

/** Segmented share bar. Segments are basis points. */
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
      Total {bps / 100}%{bps > 10000 ? " (over 100%)" : bps < 10000 ? " (under 100%)" : ""}
    </span>
  );
}
