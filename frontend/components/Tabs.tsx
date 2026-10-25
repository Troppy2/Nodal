"use client";

import { cn } from "@/lib/utils";

/**
 * Underlined tab strip used across screens. `fill` stretches tabs to equal widths (mobile style).
 * Tabs with a `count` show it in a small sunken badge.
 */
export function TabStrip<T extends string>({
  tabs,
  value,
  onChange,
  fill,
  className,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex border-b border-line", fill ? "" : "gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0", className)}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "-mb-px flex min-h-11 items-center justify-center gap-1.5 border-b-2 text-[15px] transition-colors",
            fill && "flex-1",
            value === t.id ? "border-ink font-bold text-ink" : "border-transparent font-medium text-muted-ink hover:border-line hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-sunken px-1.5 text-xs font-semibold text-ink">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
