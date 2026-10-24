"use client";

import type { InboxItem } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/** Requests still waiting on the viewer: inbox items that offer accept/decline. */
export function usePendingCount() {
  const { signedIn } = useSession();
  const { data } = useApi<InboxItem[]>(signedIn ? "/me/inbox" : null);
  return (data ?? []).filter((i) => i.actions.length > 0).length;
}

export function InboxBadge({ className }: { className?: string }) {
  const count = usePendingCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} waiting on you`}
      className={cn("flex size-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white", className)}
    >
      {count}
    </span>
  );
}
