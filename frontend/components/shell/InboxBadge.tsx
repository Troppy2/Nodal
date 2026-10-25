"use client";

import { useEffect, useState } from "react";
import type { ConversationOut, InboxItem, NotificationItem } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/** Requests waiting on the viewer's action (accept/decline). */
export function useRequestsCount() {
  const { signedIn } = useSession();
  const { data: inbox } = useApi<InboxItem[]>(signedIn ? "/me/inbox" : null);
  return (inbox ?? []).filter((i) => i.actions.length > 0).length;
}

/** Unread DMs count. */
export function useMessagesCount() {
  const { signedIn } = useSession();
  const { data: convos } = useApi<ConversationOut[]>(signedIn ? "/me/conversations" : null);
  return (convos ?? []).reduce((sum, c) => sum + c.unread, 0);
}

/** Unread activity alerts count (alerts created after last seen timestamp). */
export function useAlertsCount() {
  const { signedIn, me } = useSession();
  const { data: notifications } = useApi<NotificationItem[]>(signedIn ? "/me/notifications" : null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.profile?.id) return;
    const key = `nodal_alerts_seen_${me.profile.id}`;
    setLastSeen(window.localStorage.getItem(key));

    const handler = () => {
      setLastSeen(window.localStorage.getItem(key));
    };
    window.addEventListener("nodal-alerts-read", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("nodal-alerts-read", handler);
      window.removeEventListener("storage", handler);
    };
  }, [me?.profile?.id]);

  if (!signedIn || !notifications || notifications.length === 0) return 0;
  if (!lastSeen) return notifications.length;

  const seenTime = new Date(lastSeen).getTime();
  return notifications.filter((n) => new Date(n.created_at).getTime() > seenTime).length;
}

/** Total combined pending count (requests + messages). */
export function usePendingCount() {
  const requests = useRequestsCount();
  const messages = useMessagesCount();
  return requests + messages;
}

export function RequestsBadge({ className }: { className?: string }) {
  const count = useRequestsCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} requests waiting on your answer`}
      className={cn("flex size-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white", className)}
    >
      {count}
    </span>
  );
}

export function MessagesBadge({ className }: { className?: string }) {
  const count = useMessagesCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} unread messages`}
      className={cn("flex size-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white", className)}
    >
      {count}
    </span>
  );
}

export function AlertsBadge({ className }: { className?: string }) {
  const count = useAlertsCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} new activity alerts`}
      className={cn("size-2 rounded-full bg-teal shrink-0", className)}
    />
  );
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
