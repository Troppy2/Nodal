"use client";

import type { ConversationOut, InboxItem } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/** Requests still waiting on the viewer and unread DMs. */
export function usePendingCount() {
  const { signedIn } = useSession();
  const { data: inbox } = useApi<InboxItem[]>(signedIn ? "/me/inbox" : null);
  const { data: convos } = useApi<ConversationOut[]>(signedIn ? "/me/conversations" : null);
  const pendingInbox = (inbox ?? []).filter((i) => i.actions.length > 0).length;
  const unreadMessages = (convos ?? []).reduce((sum, c) => sum + c.unread, 0);
  return pendingInbox + unreadMessages;
}

export function InboxBadge({ className }: { className?: string }) {
  const count = usePendingCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} notifications waiting on you`}
      className={cn("flex size-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white", className)}
    >
      {count}
    </span>
  );
}
