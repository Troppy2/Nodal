"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Bell, CheckCheck, CheckCircle2, MessageSquare, Star, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import type { NotificationItem } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ago } from "./format";

type AlertFilter = "all" | "star" | "comment" | "follow" | "bounty";

function NotificationRow({ item }: { item: NotificationItem }) {
  const icon =
    item.kind === "star" ? (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
        <Star className="size-4 fill-amber-500" />
      </div>
    ) : item.kind === "comment" ? (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
        <MessageSquare className="size-4" />
      </div>
    ) : item.kind === "follow" ? (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
        <UserPlus className="size-4" />
      </div>
    ) : item.kind === "bounty" ? (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-tint text-teal">
        <Award className="size-4" />
      </div>
    ) : (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-ink">
        <Bell className="size-4" />
      </div>
    );

  return (
    <li className="group">
      <Link
        href={item.link}
        className="flex items-start gap-3.5 rounded-xl p-4 transition-all hover:bg-sunken border border-transparent hover:border-line/70"
      >
        <Avatar person={item.actor} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm text-ink truncate">
                {item.actor.display_name || item.actor.handle}
              </span>
              <span className="text-xs text-muted-ink truncate">@{item.actor.handle}</span>
            </div>
            <span className="text-xs text-muted-ink shrink-0">{ago(item.created_at)}</span>
          </div>

          <div className="mt-1 flex items-start gap-2">
            {icon}
            <p className="text-sm text-ink leading-relaxed flex-1 pt-0.5">
              {item.message}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function AlertsView() {
  const { ready, signedIn, me } = useSession();
  const notifications = useApi<NotificationItem[]>(signedIn ? "/me/notifications" : null);
  const [filter, setFilter] = useState<AlertFilter>("all");

  // Automatically mark alerts as seen when viewing the alerts page
  useEffect(() => {
    if (!me?.profile?.id || !notifications.data) return;
    const key = `nodal_alerts_seen_${me.profile.id}`;
    const now = new Date().toISOString();
    window.localStorage.setItem(key, now);
    window.dispatchEvent(new CustomEvent("nodal-alerts-read", { detail: { seenAt: now } }));
  }, [me?.profile?.id, notifications.data]);

  function handleMarkAllAsRead() {
    if (!me?.profile?.id) return;
    const key = `nodal_alerts_seen_${me.profile.id}`;
    const now = new Date().toISOString();
    window.localStorage.setItem(key, now);
    window.dispatchEvent(new CustomEvent("nodal-alerts-read", { detail: { seenAt: now } }));
    toast.success("All alerts marked as read");
  }

  if (ready && !signedIn) {
    return (
      <EmptyState
        title="Sign in to view your alerts"
        body="Stars, comments, followers, and bounty updates show up here."
        action={
          <Link href="/" className={btn.primary}>
            Sign in
          </Link>
        }
        className="py-24"
      />
    );
  }

  const items = notifications.data ?? [];
  const filtered = items.filter((n) => (filter === "all" ? true : n.kind === filter));

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 lg:px-8">
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-ink">Alerts & Activity</h1>
            <p className="text-sm text-muted-ink mt-0.5">Real-time updates on your projects, followers, and bounties</p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-muted-ink hover:text-ink hover:border-ink/40 transition-colors shadow-2xs"
              >
                <CheckCheck className="size-3.5 text-teal" /> Mark all read
              </button>
            )}
            {items.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-ink">
                <CheckCircle2 className="size-3.5 text-teal" /> {items.length} total
              </span>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="mt-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line pb-3">
          {[
            { id: "all" as const, label: "All Alerts" },
            { id: "star" as const, label: "Stars" },
            { id: "comment" as const, label: "Comments" },
            { id: "follow" as const, label: "Followers" },
            { id: "bounty" as const, label: "Bounties" },
          ].map(({ id, label }) => {
            const count = id === "all" ? items.length : items.filter((n) => n.kind === id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap",
                  filter === id
                    ? "bg-ink text-white shadow-xs"
                    : "bg-sunken text-muted-ink hover:text-ink hover:bg-sunken/80",
                )}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px]",
                      filter === id ? "bg-white/20 text-white" : "bg-white text-muted-ink border border-line",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Notifications list */}
      <div className="rounded-2xl border border-line bg-white p-2 sm:p-3 shadow-xs">
        {notifications.error ? (
          <ErrorState error={notifications.error} onRetry={notifications.reload} />
        ) : !notifications.data ? (
          <RowsSkeleton rows={5} className="p-4" />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <EmptyState
              title={filter === "all" ? "No activity yet" : `No ${filter} alerts`}
              body={
                filter === "all"
                  ? "When other creators star your projects, post comments, follow you, or release bounties, they'll land here."
                  : `There are no ${filter} notifications at this time.`
              }
              action={
                <Link href="/explore" className={btn.secondary}>
                  Explore projects & people
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {filtered.map((item) => (
              <NotificationRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
