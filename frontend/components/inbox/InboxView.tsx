"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Award, Bell, Check, ChevronLeft, Loader2, MessageSquare, Star, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import { api } from "@/lib/api";
import type { CollabOut, ConversationOut, Cycle, InboxItem, NotificationItem, ProfileLite } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ago, describe, displayName, joinNames } from "./format";
import { ConversationRow, MessageThread } from "./Messages";
import { RingInviteCard } from "./RingInviteCard";

type Filter = "requests" | "sent" | "activity" | "messages";

const kindLabel = { collab: "Join request", swap: "Swap", ring: "Ring" } as const;

function Faces({ people, size }: { people: ProfileLite[]; size: number }) {
  if (people.length === 0) return <span className="shrink-0 rounded-full bg-sunken" style={{ width: size, height: size }} />;
  if (people.length === 1) return <Avatar person={people[0]} size={size} />;
  // Two faces side by side with a slight overlap, so both sets of initials stay readable.
  const small = Math.round(size * 0.72);
  return (
    <span className="flex shrink-0 items-center" style={{ width: size + small * 0.45 }}>
      <Avatar person={people[0]} size={small} />
      <span className="-ml-2 rounded-full border-2 border-white">
        <Avatar person={people[1]} size={small} />
      </span>
    </span>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const icon =
    item.kind === "star" ? (
      <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
    ) : item.kind === "comment" ? (
      <MessageSquare className="size-4 text-sky-500 shrink-0" />
    ) : item.kind === "follow" ? (
      <UserPlus className="size-4 text-purple-500 shrink-0" />
    ) : item.kind === "bounty" ? (
      <Award className="size-4 text-teal shrink-0" />
    ) : (
      <Bell className="size-4 text-ink shrink-0" />
    );

  return (
    <li>
      <Link
        href={item.link}
        className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-sunken border-b border-line/60"
      >
        <Avatar person={item.actor} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-ink">
            {icon}
            <span className="font-semibold text-ink">@{item.actor.handle}</span>
            <span>·</span>
            <span>{ago(item.created_at)}</span>
          </div>
          <p className="mt-1 text-sm text-ink leading-snug">{item.message}</p>
        </div>
      </Link>
    </li>
  );
}

function FilterToggle({
  value,
  onChange,
  unread,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  unread: number;
}) {
  const filters: { id: Filter; label: string }[] = [
    { id: "requests", label: "Requests" },
    { id: "sent", label: "Sent" },
    { id: "activity", label: "Alerts" },
    { id: "messages", label: "Messages" },
  ];
  return (
    <div className="flex w-full rounded-lg border border-line p-0.5 sm:w-auto overflow-x-auto" role="group" aria-label="Show">
      {filters.map(({ id, label }) => (
        <button
          key={id}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs sm:text-sm font-semibold transition-colors sm:flex-none sm:px-3",
            value === id ? "bg-ink text-white" : "text-muted-ink hover:bg-sunken hover:text-ink",
          )}
        >
          {label}
          {id === "messages" && unread > 0 && (
            <span
              className={cn(
                "flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                value === id ? "bg-white text-ink" : "bg-teal text-white",
              )}
            >
              {unread}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function statusText(item: InboxItem) {
  if (item.actions.length) return null;
  return item.status === "accepted" ? "Accepted" : item.status === "declined" ? "Declined" : "Pending";
}

function ItemRow({ item, active, onOpen }: { item: InboxItem; active: boolean; onOpen: () => void }) {
  const { title, summary } = describe(item);
  const status = statusText(item);
  return (
    <li>
      <button
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 px-5 py-3.5 text-left transition-colors focus-visible:outline-offset-[-3px]",
          active ? "bg-sunken" : "hover:bg-sunken/60",
        )}
      >
        <Faces people={item.people} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-semibold">{title}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-ink">
              {ago(item.created_at)}
              {item.actions.length > 0 && <span className="size-2 rounded-full bg-teal" aria-label="Needs your answer" />}
            </span>
          </span>
          <span className="block truncate text-sm text-muted-ink">{summary}</span>
          <span className="mt-1 flex gap-2 text-xs">
            <span className={cn("font-medium", item.kind === "collab" ? "text-ink" : "text-teal")}>{kindLabel[item.kind]}</span>
            {status && <span className="text-muted-ink">{status}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function CollabCard({
  item,
  busy,
  onRespond,
}: {
  item: InboxItem;
  busy: boolean;
  onRespond: (r: "accepted" | "declined") => void;
}) {
  const other = item.people[0];
  const incoming = item.direction === "incoming";
  const project = item.project;
  return (
    <div className="focus-inset overflow-hidden rounded-xl border border-line">
      <div className="px-4 py-4">
        <p className="text-[15px] leading-relaxed">
          {incoming ? (
            <>
              <span className="font-semibold">{other ? displayName(other) : "Someone"}</span> wants to help with{" "}
              {project ? (
                <Link href={`/projects/${project.id}`} className="font-semibold underline decoration-line underline-offset-4 hover:decoration-ink">
                  {project.title}
                </Link>
              ) : (
                "your project"
              )}{" "}
              as <span className="font-semibold">{item.skill?.name}</span>.
            </>
          ) : (
            <>
              You offered <span className="font-semibold">{item.skill?.name}</span> for{" "}
              {project ? (
                <Link href={`/projects/${project.id}`} className="font-semibold underline decoration-line underline-offset-4 hover:decoration-ink">
                  {project.title}
                </Link>
              ) : (
                "a project"
              )}
              .
            </>
          )}
        </p>
        {item.message && (
          <blockquote className="mt-3 border-l-2 border-line pl-3 text-[15px] leading-relaxed text-ink/80">{item.message}</blockquote>
        )}
      </div>
      <div className="border-t border-line bg-sunken/60 px-4 py-3">
        {item.actions.length > 0 ? (
          <div className="flex gap-2 max-sm:flex-col">
            <button disabled={busy} onClick={() => onRespond("accepted")} className={cn(btn.match, "max-sm:w-full")}>
              Accept
            </button>
            <button disabled={busy} onClick={() => onRespond("declined")} className={cn(btn.secondary, "max-sm:w-full")}>
              Decline
            </button>
          </div>
        ) : item.status === "accepted" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-teal">
              <Check className="size-4" /> {incoming ? `${other ? displayName(other) : "They"} joined the team` : "Accepted. You're on the team."}
            </p>
            {project && (
              <Link href={`/projects/${project.id}/team`} className={btn.secondary}>
                Open team
              </Link>
            )}
          </div>
        ) : item.status === "declined" ? (
          <p className="flex items-center gap-2 text-sm text-muted-ink">
            <X className="size-4" /> Declined
          </p>
        ) : (
          <p className="text-sm text-muted-ink">Waiting on {other ? displayName(other) : "the owner"}.</p>
        )}
      </div>
    </div>
  );
}

function CycleSuggestions({
  cycles,
  items,
  meId,
  onInvited,
  onProposeCustom,
}: {
  cycles: Cycle[];
  items: InboxItem[];
  meId: string;
  onInvited: (item: InboxItem) => void;
  onProposeCustom?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const key = (ids: string[]) => [...ids].sort().join(",");
  const started = new Set(
    items.filter((i) => i.kind !== "collab" && i.status !== "declined").map((i) => `${i.kind}:${key(Object.keys(i.responses))}`),
  );
  const open = cycles.filter((c) => !started.has(`${c.kind}:${key(c.members.map((m) => m.id))}`));
  if (open.length === 0) {
    return (
      <section aria-labelledby="start-title" className="border-t border-line px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="start-title" className="text-[13px] font-semibold text-muted-ink">
            Skill Swaps
          </h2>
          <button
            type="button"
            onClick={onProposeCustom}
            className="text-xs font-semibold text-teal hover:underline"
          >
            + Propose custom swap
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-ink">Trade skills with another creator with 0 Tolken spent.</p>
      </section>
    );
  }

  async function invite(c: Cycle) {
    setBusy(c.id);
    try {
      const item = await api<InboxItem>("/cycles/invite", { method: "POST", body: { cycle_id: c.id } });
      toast.success(c.kind === "swap" ? "Swap invite sent" : "Ring invite sent");
      onInvited(item);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="start-title" className="border-t border-line px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="start-title" className="text-[13px] font-semibold text-muted-ink">
          Swaps and rings
        </h2>
        <button
          type="button"
          onClick={onProposeCustom}
          className="text-xs font-semibold text-teal hover:underline"
        >
          + Custom swap
        </button>
      </div>
      <ul className="mt-2 flex flex-col">
        {open.slice(0, 5).map((c) => {
          const others = c.members.filter((m) => m.id !== meId);
          const mine = c.links.find((l) => l.from === meId);
          return (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <Faces people={others} size={36} />
              <div className="min-w-0 flex-1 leading-snug">
                <p className="truncate text-sm font-semibold">
                  {c.kind === "swap" ? "Swap" : "Ring"} with {joinNames(others.map(displayName))}
                </p>
                {mine && <p className="truncate text-[13px] text-muted-ink">You do {mine.skill.name} for {mine.project_title}</p>}
              </div>
              <button disabled={busy === c.id} onClick={() => invite(c)} className={cn(btn.match, "h-9 px-3")}>
                Invite
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Requests in one place: join requests, swap invites, and ring invites. List and detail on desktop; one at a time on mobile. */

function CustomSwapDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (item: InboxItem) => void;
}) {
  const [partnerHandle, setPartnerHandle] = useState("");
  const [myProjectId, setMyProjectId] = useState("");
  const [theirProjectId, setTheirProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerHandle.trim() || !myProjectId.trim() || !theirProjectId.trim()) return;
    setSubmitting(true);
    try {
      // Find partner profile by handle
      const partner = await api<{ profile: ProfileLite }>(`/profiles/${partnerHandle.trim().replace(/^@/, "")}`);
      const item = await api<InboxItem>("/cycles/custom-swap", {
        method: "POST",
        body: {
          partner_id: partner.profile.id,
          my_project_id: myProjectId.trim(),
          my_skill_id: 1,
          their_project_id: theirProjectId.trim(),
          their_skill_id: 1,
        },
      });
      toast.success("Swap proposal sent! Partner notified in their inbox.");
      onCreated(item);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Propose a skill swap</DialogTitle>
        <DialogDescription>
          Agree to help each other&apos;s project with 0 Tolken exchanged. When both accept, you both join each other&apos;s team.
        </DialogDescription>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">Partner Handle</label>
            <input
              value={partnerHandle}
              onChange={(e) => setPartnerHandle(e.target.value)}
              placeholder="e.g. alex or sarah"
              className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Your Project ID / Slug</label>
            <input
              value={myProjectId}
              onChange={(e) => setMyProjectId(e.target.value)}
              placeholder="Your project ID that needs their help"
              className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Their Project ID / Slug</label>
            <input
              value={theirProjectId}
              onChange={(e) => setTheirProjectId(e.target.value)}
              placeholder="Their project ID you want to help"
              className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              required
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-3 mt-1">
            <button type="button" onClick={onClose} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={btn.primary}>
              {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Send swap proposal
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InboxView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { ready, signedIn, me } = useSession();
  const inbox = useApi<InboxItem[]>(signedIn ? "/me/inbox" : null);
  const cycles = useApi<Cycle[]>(signedIn ? "/me/cycles" : null);
  const conversations = useApi<ConversationOut[]>(signedIn ? "/me/conversations" : null);
  const notifications = useApi<NotificationItem[]>(signedIn ? "/me/notifications" : null);
  const [proposingSwap, setProposingSwap] = useState(false);
  const [filter, setFilter] = useState<Filter>("requests");
  const [busy, setBusy] = useState(false);
  const selectedId = params.get("thread");
  const messageProfileId = selectedId?.startsWith("m:") ? selectedId.slice(2) : null;
  const meProfile = me?.profile ?? null;

  const select = (id: string | null) => router.replace(id ? `${pathname}?thread=${id}` : pathname, { scroll: false });

  if (ready && !signedIn) {
    return (
      <EmptyState
        title="Sign in to see your inbox"
        body="Join requests, swap invites, ring invites, and messages land here."
        action={
          <Link href="/" className={btn.primary}>
            Sign in
          </Link>
        }
        className="py-24"
      />
    );
  }

  const items = inbox.data ?? [];
  const shown = items.filter((i) => (filter === "requests" ? i.direction === "incoming" : i.direction === "outgoing"));
  const convos = conversations.data ?? [];
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const pendingCount = items.filter((i) => i.actions.length > 0).length;
  const unread = convos.reduce((sum, c) => sum + c.unread, 0);
  const hasSelection = Boolean(selected || messageProfileId);

  function replace(next: InboxItem) {
    inbox.mutate((prev) => (prev ?? []).map((i) => (i.id === next.id ? next : i)));
  }

  async function respond(item: InboxItem, response: "accepted" | "declined") {
    setBusy(true);
    try {
      if (item.kind === "collab") {
        const res = await api<CollabOut>(`/collab-requests/${item.id}/respond`, { method: "POST", body: { status: response } });
        replace({ ...item, status: res.status, actions: [] });
      } else {
        replace(await api<InboxItem>(`/cycle-invites/${item.id}/respond`, { method: "POST", body: { response } }));
      }
      toast.success(response === "accepted" ? "Accepted" : "Declined");
      invalidate("/projects", "/me/cycles", "/feed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const detail = messageProfileId ? (
    <MessageThread profileId={messageProfileId} onBack={() => select(null)} />
  ) : selected ? (
    <div className="flex h-full flex-col min-h-0 bg-white">
      <header className="shrink-0 border-b border-line bg-white px-4 py-3 lg:px-8 lg:py-3.5">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          <button
            type="button"
            onClick={() => select(null)}
            className="flex size-9 items-center justify-center rounded-lg text-ink hover:bg-sunken -ml-1 lg:hidden"
            aria-label="Back to inbox"
          >
            <ChevronLeft className="size-5" />
          </button>
          <Faces people={selected.people} size={40} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base lg:text-lg font-extrabold tracking-tight">
              {selected.kind === "collab"
                ? describe(selected).title
                : `${selected.kind === "swap" ? "Swap" : "3-way ring"} with ${joinNames(selected.people.map(displayName))}`}
            </h2>
            <p className="text-xs lg:text-[13px] text-muted-ink">
              {selected.direction === "incoming" ? "Received" : "Sent"}{" "}
              {ago(selected.created_at) === "now" ? "just now" : `${ago(selected.created_at)} ago`}
            </p>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[720px]">
          {selected.kind === "collab" ? (
            <CollabCard item={selected} busy={busy} onRespond={(r) => respond(selected, r)} />
          ) : (
            <RingInviteCard item={selected} me={meProfile} busy={busy} onRespond={(r) => respond(selected, r)} />
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {proposingSwap && (
        <CustomSwapDialog
          open={proposingSwap}
          onClose={() => setProposingSwap(false)}
          onCreated={(item) => {
            inbox.mutate((prev) => [item, ...(prev ?? [])]);
            setFilter("sent");
            select(item.id);
          }}
        />
      )}
      <div className="lg:grid lg:h-dvh lg:grid-cols-[380px_minmax(0,1fr)] lg:overflow-hidden">
      <aside
        className={cn(
          "border-line lg:border-r lg:flex lg:flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden bg-white",
          hasSelection && "max-lg:hidden",
        )}
      >
        <header className="shrink-0 flex flex-col gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-center sm:justify-between border-b border-line bg-white">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Inbox
            {pendingCount > 0 && <span className="ml-2 text-base font-semibold text-teal">{pendingCount} to answer</span>}
          </h1>
          <FilterToggle
            value={filter}
            onChange={(f) => {
              setFilter(f);
              select(null);
            }}
            unread={unread}
          />
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {filter === "activity" ? (
            notifications.error ? (
              <ErrorState error={notifications.error} onRetry={notifications.reload} />
            ) : !notifications.data ? (
              <RowsSkeleton rows={4} className="px-5 py-3" />
            ) : notifications.data.length === 0 ? (
              <EmptyState
                title="No activity yet"
                body="When people star, comment, follow you, or release bounties, you'll be pinged here."
                className="py-16"
              />
            ) : (
              <ul>
                {notifications.data.map((n) => (
                  <NotificationRow key={n.id} item={n} />
                ))}
              </ul>
            )
          ) : filter === "messages" ? (
            conversations.error ? (
              <ErrorState error={conversations.error} onRetry={conversations.reload} />
            ) : !conversations.data ? (
              <RowsSkeleton rows={4} className="px-5 py-3" />
            ) : convos.length === 0 ? (
              <EmptyState
                title="No messages yet"
                body="Invite someone to your project from People who fit, or message a person from their profile."
                action={
                  <Link href="/explore" className={btn.secondary}>
                    Explore projects
                  </Link>
                }
              />
            ) : (
              <ul>
                {convos.map((c) => (
                  <ConversationRow
                    key={c.profile.id}
                    item={c}
                    active={c.profile.id === messageProfileId}
                    onOpen={() => select(`m:${c.profile.id}`)}
                  />
                ))}
              </ul>
            )
          ) : inbox.error ? (
            <ErrorState error={inbox.error} onRetry={inbox.reload} />
          ) : !inbox.data ? (
            <RowsSkeleton rows={4} className="px-5 py-3" />
          ) : shown.length === 0 ? (
            <EmptyState
              title={filter === "requests" ? "No requests yet" : "Nothing sent yet"}
              body={
                filter === "requests"
                  ? "When someone offers to help or invites you to a swap, it shows up here."
                  : "Offer to help on a project, or start a swap below."
              }
              action={
                <Link href="/explore" className={btn.secondary}>
                  Find projects
                </Link>
              }
            />
          ) : (
            <ul>
              {shown.map((i) => (
                <ItemRow key={i.id} item={i} active={i.id === selectedId} onOpen={() => select(i.id)} />
              ))}
            </ul>
          )}
          {filter !== "messages" && cycles.data && meProfile && (
            <CycleSuggestions
              cycles={cycles.data}
              items={items}
              meId={meProfile.id}
              onInvited={(item) => {
                inbox.mutate((prev) => [item, ...(prev ?? [])]);
                setFilter("sent");
                select(item.id);
              }}
              onProposeCustom={() => setProposingSwap(true)}
            />
          )}
        </div>
      </aside>

      <section
        className={cn(
          "flex flex-col min-h-0 lg:h-dvh lg:overflow-hidden bg-white",
          hasSelection
            ? "max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:h-dvh"
            : "max-lg:hidden",
        )}
        aria-live="polite"
      >
        {hasSelection ? (
          detail
        ) : selectedId ? (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState title="That one is gone" body="It may have been withdrawn or deleted." />
          </div>
        ) : (
          <div className="hidden h-full items-center justify-center p-8 lg:flex">
            <EmptyState
              title={filter === "messages" ? "Pick a conversation" : "Pick a request"}
              body={
                filter === "messages"
                  ? "Choose a thread on the left to read it and reply."
                  : "Choose one on the left to see who's asking and answer it."
              }
            />
          </div>
        )}
      </section>
    </div>
    </>
  );
}
