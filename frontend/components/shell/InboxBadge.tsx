"use client";

import { inboxUnread } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Requests still waiting on the viewer. */
export function usePendingCount() {
  const { responses } = useDemoStore();
  return Math.max(0, inboxUnread - Object.keys(responses).length);
}

export function InboxBadge({ className }: { className?: string }) {
  const count = usePendingCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} pending`}
      className={cn("flex size-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white", className)}
    >
      {count}
    </span>
  );
}
