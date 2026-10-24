"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import { api } from "@/lib/api";
import type { CollabOut, ConversationOut, Cycle, InboxItem, ProfileLite } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ago, describe, displayName, joinNames } from "./format";
import { ConversationRow, MessageThread } from "./Messages";
import { RingInviteCard } from "./RingInviteCard";

type Filter = "requests" | "sent" | "messages";

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

function FilterToggle({
  value,
  onChange,
  unread,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  unread: number;
}) {
  return (
    <div className="flex w-full rounded-lg border border-line p-0.5 sm:w-auto" role="group" aria-label="Show">
      {(["requests", "sent", "messages"] as const).map((f) => (
        <button
          key={f}
          aria-pressed={value === f}
          onClick={() => onChange(f)}
          className={cn(
            "flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold capitalize transition-colors sm:flex-none sm:px-3.5",
            value === f ? "bg-ink text-white" : "text-muted-ink hover:bg-sunken hover:text-ink",
          )}
        >
          {f}
          {f === "messages" && unread > 0 && (
            <span
              className={cn(
                "flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                value === f ? "bg-white text-ink" : "bg-teal text-white",
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
}: {
  cycles: Cycle[];
  items: InboxItem[];
  meId: string;
  onInvited: (item: InboxItem) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const key = (ids: string[]) => [...ids].sort().join(",");
  const started = new Set(
    items.filter((i) => i.kind !== "collab" && i.status !== "declined").map((i) => `${i.kind}:${key(Object.keys(i.responses))}`),
  );
  const open = cycles.filter((c) => !started.has(`${c.kind}:${key(c.members.map((m) => m.id))}`));
  if (open.length === 0) return null;

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
      <h2 id="start-title" className="text-[13px] font-semibold text-muted-ink">
        Swaps and rings you can start
      </h2>
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
export function InboxView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { ready, signedIn, me } = useSession();
  const inbox = useApi<InboxItem[]>(signedIn ? "/me/inbox" : null);
  const cycles = useApi<Cycle[]>(signedIn ? "/me/cycles" : null);
  const conversations = useApi<ConversationOut[]>(signedIn ? "/me/conversations" : null);
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
    <MessageThread profileId={messageProfileId} />
  ) : selected ? (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Faces people={selected.people} size={44} />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight">
            {selected.kind === "collab"
              ? describe(selected).title
              : `${selected.kind === "swap" ? "Swap" : "3-way ring"} with ${joinNames(selected.people.map(displayName))}`}
          </h2>
          <p className="text-[13px] text-muted-ink">
            {selected.direction === "incoming" ? "Received" : "Sent"}{" "}
            {ago(selected.created_at) === "now" ? "just now" : `${ago(selected.created_at)} ago`}
          </p>
        </div>
      </header>
      {selected.kind === "collab" ? (
        <CollabCard item={selected} busy={busy} onRespond={(r) => respond(selected, r)} />
      ) : (
        <RingInviteCard item={selected} me={meProfile} busy={busy} onRespond={(r) => respond(selected, r)} />
      )}
    </div>
  ) : null;

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[380px_minmax(0,1fr)]">
      <aside className={cn("border-line lg:border-r", hasSelection && "max-lg:hidden")}>
        <header className="flex flex-col gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
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

        {filter === "messages" ? (
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
            <ul className="border-t border-line">
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
          <ul className="border-t border-line">
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
          />
        )}
      </aside>

      <section className={cn("px-4 py-5 lg:px-8 lg:py-7", !hasSelection && "max-lg:hidden")} aria-live="polite">
        {hasSelection ? (
          <>
            <button onClick={() => select(null)} className={cn(btn.ghost, "-ml-2 mb-3 px-2 lg:hidden")}>
              <ChevronLeft className="size-5" /> {messageProfileId ? "Messages" : "Inbox"}
            </button>
            {detail}
          </>
        ) : selectedId ? (
          <EmptyState title="That one is gone" body="It may have been withdrawn or deleted." />
        ) : (
          <EmptyState
            title={filter === "messages" ? "Pick a conversation" : "Pick a request"}
            body={
              filter === "messages"
                ? "Choose a thread on the left to read it and reply."
                : "Choose one on the left to see who's asking and answer it."
            }
            className="hidden lg:flex"
          />
        )}
      </section>
    </div>
  );
}
