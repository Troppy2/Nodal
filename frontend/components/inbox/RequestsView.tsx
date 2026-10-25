"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, ChevronLeft, Clock, Handshake, Loader2, Sparkles, UserCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import { api } from "@/lib/api";
import type { CollabOut, Cycle, InboxItem, ProfileLite } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ago, describe, displayName, joinNames } from "./format";
import { RingInviteCard } from "./RingInviteCard";

type DirectionTab = "received" | "sent";
type StatusFilter = "all" | "pending" | "accepted" | "declined";

const kindLabel = { collab: "Join Request", swap: "Skill Swap", ring: "3-Way Ring" } as const;

function Faces({ people, size }: { people: ProfileLite[]; size: number }) {
  if (people.length === 0) return <span className="shrink-0 rounded-full bg-sunken" style={{ width: size, height: size }} />;
  if (people.length === 1) return <Avatar person={people[0]} size={size} />;
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
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
      <div className="border-b border-line bg-sunken/40 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-ink px-2.5 py-1 text-xs font-bold text-white">
              <Handshake className="size-3.5" /> Join Request
            </span>
            <span
              className={cn(
                "rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize",
                item.status === "accepted"
                  ? "bg-teal-tint text-teal border border-teal/30"
                  : item.status === "declined"
                  ? "bg-sunken text-muted-ink"
                  : "bg-amber-500/10 text-amber-700 border border-amber-500/30",
              )}
            >
              {item.status}
            </span>
          </div>
          <span className="text-xs text-muted-ink">{ago(item.created_at)}</span>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start gap-3.5">
          {other && <Avatar person={other} size={48} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-base font-bold text-ink">
                {other ? displayName(other) : "A collaborator"}
              </h3>
              {other && (
                <Link
                  href={`/u/${other.handle}`}
                  className="text-xs font-semibold text-teal hover:underline shrink-0"
                >
                  @{other.handle}
                </Link>
              )}
            </div>

            <p className="mt-1 text-sm text-ink leading-relaxed">
              {incoming ? (
                <>
                  Offered <span className="font-bold text-teal">{item.skill?.name || "their help"}</span> to join{" "}
                  {project ? (
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-bold text-ink underline decoration-line hover:decoration-ink"
                    >
                      {project.title}
                    </Link>
                  ) : (
                    "your project"
                  )}
                  .
                </>
              ) : (
                <>
                  You requested to contribute <span className="font-bold text-teal">{item.skill?.name || "your skills"}</span> on{" "}
                  {project ? (
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-bold text-ink underline decoration-line hover:decoration-ink"
                    >
                      {project.title}
                    </Link>
                  ) : (
                    "this project"
                  )}
                  .
                </>
              )}
            </p>
          </div>
        </div>

        {item.message && (
          <div className="rounded-xl border border-line bg-sunken/40 p-4">
            <span className="block text-xs font-bold text-muted-ink mb-1">Attached note:</span>
            <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">{item.message}</p>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-sunken/40 px-5 py-4">
        {item.actions.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              disabled={busy}
              onClick={() => onRespond("accepted")}
              className={cn(btn.match, "flex-1 justify-center h-10 text-sm font-bold shadow-xs")}
            >
              {busy ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Check className="size-4 mr-1.5" />}
              Accept and add to team
            </button>
            <button
              disabled={busy}
              onClick={() => onRespond("declined")}
              className={cn(btn.secondary, "sm:w-32 justify-center h-10 text-sm font-semibold")}
            >
              <X className="size-4 mr-1" />
              Decline
            </button>
          </div>
        ) : item.status === "accepted" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-teal">
              <Check className="size-4 stroke-[2.5]" />
              {incoming ? `${other ? displayName(other) : "Contributor"} is on the team!` : "Accepted! You are now a team member."}
            </p>
            {project && (
              <div className="flex items-center gap-2">
                <Link href={`/projects/${project.id}`} className={cn(btn.secondary, "h-8.5 px-3 text-xs")}>
                  View project
                </Link>
                <Link href={`/projects/${project.id}/team`} className={cn(btn.primary, "h-8.5 px-3 text-xs")}>
                  Open team & shares
                </Link>
              </div>
            )}
          </div>
        ) : item.status === "declined" ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-ink">
            <X className="size-4" /> This request was declined.
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-ink">
            <Clock className="size-4" />
            <span>Waiting on {other ? displayName(other) : "the project owner"} to review and respond.</span>
          </div>
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

  async function invite(c: Cycle) {
    setBusy(c.id);
    try {
      const item = await api<InboxItem>("/cycles/invite", { method: "POST", body: { cycle_id: c.id } });
      toast.success(c.kind === "swap" ? "Swap invite sent!" : "3-way ring invite sent!");
      onInvited(item);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="start-title" className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="start-title" className="text-sm font-extrabold text-ink flex items-center gap-1.5">
            <Sparkles className="size-4 text-teal" /> Potential Skill Swaps & Rings
          </h2>
          <p className="mt-0.5 text-xs text-muted-ink">
            Trade skills with other creators to build together with 0 Tolken spent.
          </p>
        </div>
        <button
          type="button"
          onClick={onProposeCustom}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-teal hover:border-teal transition-colors shrink-0"
        >
          + Custom Swap
        </button>
      </div>

      {open.length === 0 ? (
        <p className="mt-4 text-xs text-muted-ink italic">No direct swaps discovered right now. You can propose a custom swap anytime!</p>
      ) : (
        <ul className="mt-4 divide-y divide-line/60">
          {open.slice(0, 4).map((c) => {
            const others = c.members.filter((m) => m.id !== meId);
            const mine = c.links.find((l) => l.from === meId);
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <Faces people={others} size={40} />
                <div className="min-w-0 flex-1 leading-snug">
                  <p className="truncate text-sm font-bold text-ink">
                    {c.kind === "swap" ? "2-Way Swap" : "3-Way Ring"} with {joinNames(others.map(displayName))}
                  </p>
                  {mine && (
                    <p className="truncate text-xs text-muted-ink mt-0.5">
                      You provide <span className="font-semibold text-ink">{mine.skill.name}</span> for {mine.project_title}
                    </p>
                  )}
                </div>
                <button
                  disabled={busy === c.id}
                  onClick={() => invite(c)}
                  className={cn(btn.match, "h-8.5 px-3.5 text-xs font-bold shrink-0")}
                >
                  {busy === c.id ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Send Invite
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

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

export function RequestsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { ready, signedIn, me, refreshMe } = useSession();

  const inbox = useApi<InboxItem[]>(signedIn ? "/me/inbox" : null);
  const cycles = useApi<Cycle[]>(signedIn ? "/me/cycles" : null);

  const [direction, setDirection] = useState<DirectionTab>("received");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [proposingSwap, setProposingSwap] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedId = params.get("id");
  const meProfile = me?.profile ?? null;

  const select = (id: string | null) => {
    router.replace(id ? `${pathname}?id=${id}` : pathname, { scroll: false });
  };

  if (ready && !signedIn) {
    return (
      <EmptyState
        title="Sign in to view your requests"
        body="Collaboration requests, swap invitations, and responses show up here."
        action={
          <Link href="/" className={btn.primary}>
            Sign in
          </Link>
        }
        className="py-24"
      />
    );
  }

  const allItems = inbox.data ?? [];
  const receivedItems = allItems.filter((i) => i.direction === "incoming");
  const sentItems = allItems.filter((i) => i.direction === "outgoing");
  const currentDirectionItems = direction === "received" ? receivedItems : sentItems;

  const pendingReceivedCount = receivedItems.filter((i) => i.actions.length > 0).length;

  const filteredItems = currentDirectionItems.filter((item) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return item.status === "pending" || item.actions.length > 0;
    if (statusFilter === "accepted") return item.status === "accepted";
    if (statusFilter === "declined") return item.status === "declined";
    return true;
  });

  const selected = allItems.find((i) => i.id === selectedId) ?? null;

  function replace(next: InboxItem) {
    inbox.mutate((prev) => (prev ?? []).map((i) => (i.id === next.id ? next : i)));
  }

  async function respond(item: InboxItem, response: "accepted" | "declined") {
    setBusy(true);
    try {
      if (item.kind === "collab") {
        const res = await api<CollabOut>(`/collab-requests/${item.id}/respond`, {
          method: "POST",
          body: { status: response },
        });
        replace({ ...item, status: res.status, actions: [] });
      } else {
        const res = await api<InboxItem>(`/cycle-invites/${item.id}/respond`, {
          method: "POST",
          body: { response },
        });
        replace(res);
      }
      toast.success(response === "accepted" ? "Accepted!" : "Declined");
      invalidate("/projects", "/me/cycles", "/feed", "/me/projects", "/me/tolken", "/me");
      refreshMe();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const detailView = selected ? (
    <div className="flex h-full flex-col min-h-0 bg-white">
      <header className="shrink-0 border-b border-line bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => select(null)}
            className="flex size-9 items-center justify-center rounded-lg text-ink hover:bg-sunken -ml-1 lg:hidden"
            aria-label="Back to requests list"
          >
            <ChevronLeft className="size-5" />
          </button>
          <Faces people={selected.people} size={42} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base lg:text-lg font-extrabold text-ink">
              {selected.kind === "collab"
                ? describe(selected).title
                : `${selected.kind === "swap" ? "Skill Swap" : "3-Way Ring"} with ${joinNames(selected.people.map(displayName))}`}
            </h2>
            <p className="text-xs text-muted-ink">
              {selected.direction === "incoming" ? "Received from " : "Sent by you "} · {ago(selected.created_at)}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-[700px]">
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
            setDirection("sent");
            select(item.id);
          }}
        />
      )}

      <div className="lg:grid lg:h-dvh lg:grid-cols-[400px_minmax(0,1fr)] lg:overflow-hidden bg-white">
        {/* Left side: Requests Master List */}
        <aside
          className={cn(
            "border-line lg:border-r lg:flex lg:flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden bg-white",
            selected && "max-lg:hidden",
          )}
        >
          {/* Main Requests Header */}
          <header className="shrink-0 border-b border-line px-5 pt-5 pb-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-ink">Requests</h1>
                <p className="text-xs text-muted-ink mt-0.5">Manage incoming collaborations & sent proposals</p>
              </div>
              <button
                type="button"
                onClick={() => setProposingSwap(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-teal hover:border-teal transition-colors shadow-2xs"
              >
                + Custom Swap
              </button>
            </div>

            {/* Received vs Sent Main Tabs */}
            <div className="grid grid-cols-2 rounded-xl bg-sunken p-1 text-sm font-bold">
              <button
                type="button"
                onClick={() => {
                  setDirection("received");
                  setStatusFilter("all");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2 transition-all",
                  direction === "received" ? "bg-white text-ink shadow-xs" : "text-muted-ink hover:text-ink",
                )}
              >
                <span>Received</span>
                {pendingReceivedCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white">
                    {pendingReceivedCount}
                  </span>
                ) : (
                  <span className="text-xs font-normal text-muted-ink">({receivedItems.length})</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection("sent");
                  setStatusFilter("all");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2 transition-all",
                  direction === "sent" ? "bg-white text-ink shadow-xs" : "text-muted-ink hover:text-ink",
                )}
              >
                <span>Sent</span>
                <span className="text-xs font-normal text-muted-ink">({sentItems.length})</span>
              </button>
            </div>

            {/* Sub-filter chips */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(["all", "pending", "accepted", "declined"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize whitespace-nowrap transition-colors",
                    statusFilter === f
                      ? "bg-ink text-white"
                      : "bg-sunken text-muted-ink hover:bg-sunken/80 hover:text-ink",
                  )}
                >
                  {f === "pending" ? (direction === "received" ? "Needs Answer" : "Pending") : f}
                </button>
              ))}
            </div>
          </header>

          {/* List content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
            {inbox.error ? (
              <ErrorState error={inbox.error} onRetry={inbox.reload} />
            ) : !inbox.data ? (
              <RowsSkeleton rows={4} className="py-2" />
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <EmptyState
                  title={direction === "received" ? "No received requests" : "No sent requests"}
                  body={
                    direction === "received"
                      ? "When creators offer to join your projects or invite you to swaps, they will appear here."
                      : "When you request to join projects or initiate skill swaps, your sent requests show up here."
                  }
                  action={
                    <Link href="/explore" className={btn.secondary}>
                      Explore projects to join
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredItems.map((item) => {
                  const { title, summary } = describe(item);
                  const isActionable = item.actions.length > 0;
                  const isSelected = item.id === selectedId;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id)}
                        className={cn(
                          "flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-colors border",
                          isSelected
                            ? "bg-teal-tint/50 border-teal/40 shadow-xs"
                            : isActionable
                            ? "bg-white border-teal/30 hover:border-teal/60 hover:bg-sunken/40"
                            : "bg-white border-line/70 hover:bg-sunken/50",
                        )}
                      >
                        <Faces people={item.people} size={42} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-ink">{title}</span>
                            <span className="text-[11px] text-muted-ink shrink-0">{ago(item.created_at)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-ink">{summary}</p>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/80">
                              <span className={cn("size-1.5 rounded-full", item.kind === "collab" ? "bg-ink" : "bg-teal")} />
                              {kindLabel[item.kind]}
                            </span>

                            {isActionable ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold text-white">
                                Action needed
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                  item.status === "accepted"
                                    ? "bg-teal/10 text-teal"
                                    : item.status === "declined"
                                    ? "bg-sunken text-muted-ink"
                                    : "bg-amber-500/10 text-amber-700",
                                )}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {cycles.data && meProfile && (
              <CycleSuggestions
                cycles={cycles.data}
                items={allItems}
                meId={meProfile.id}
                onInvited={(item) => {
                  inbox.mutate((prev) => [item, ...(prev ?? [])]);
                  setDirection("sent");
                  select(item.id);
                }}
                onProposeCustom={() => setProposingSwap(true)}
              />
            )}
          </div>
        </aside>

        {/* Right side: Request Detail Pane */}
        <section
          className={cn(
            "flex flex-col min-h-0 lg:h-dvh lg:overflow-hidden bg-sunken/20",
            selected ? "max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:h-dvh max-lg:bg-white" : "max-lg:hidden",
          )}
          aria-live="polite"
        >
          {selected ? (
            detailView
          ) : (
            <div className="hidden h-full items-center justify-center p-8 lg:flex">
              <div className="max-w-md text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white border border-line shadow-xs mb-3 text-teal">
                  <UserCheck className="size-7" />
                </div>
                <h3 className="text-lg font-bold text-ink">Select a request</h3>
                <p className="mt-1 text-sm text-muted-ink leading-relaxed">
                  Choose any request on the left to review details, accept or decline join offers, and track your sent invitations.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
