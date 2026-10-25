"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Caps children at `maxHeight` px. When the content runs past it, fades the bottom and shows a
 *  chevron to reveal the rest. `maxHeight` null means no cap (e.g. the stacked mobile layout). */
export function ClampToHeight({ maxHeight, children }: { maxHeight: number | null; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const overflows = maxHeight !== null && contentHeight > maxHeight + 1;
  const clamped = overflows && !expanded;

  return (
    <div className="relative">
      <div ref={inner} style={clamped ? { maxHeight, overflow: "hidden" } : undefined}>
        {children}
      </div>
      {clamped && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-11 h-16 bg-gradient-to-t from-white to-transparent" />}
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-11 w-full items-center justify-center gap-1 border-t border-line text-sm font-semibold text-muted-ink hover:bg-sunken hover:text-ink"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
