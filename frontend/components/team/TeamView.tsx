"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import { CoverArt } from "@/components/feed/CoverArt";
import { Label, ProjectMeta } from "@/components/Meta";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { LedgerEntry, NeedOut, ProjectDetail, TeamOut, TolkenOut } from "@/lib/api-types";
import { formatTolken } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { SHARE_COLORS, ShareBar, ShareTotal } from "./ShareBar";
import { TeamList } from "./TeamList";

const ledgerStatus: Record<LedgerEntry["status"], string> = {
  pending_funding: "Not funded yet",
  funded: "Funded, held until you release it",
  released: "Released",
  refunded: "Refunded to you",
  cancelled: "Cancelled",
};

/** One bounty need: its Tolken state and the owner's next action. */
function BountyRow({
  need,
  entry,
  own,
  balance,
  busy,
  onAction,
}: {
  need: NeedOut;
  entry: LedgerEntry | undefined;
  own: boolean;
  balance: number;
  busy: boolean;
  onAction: (action: "fund" | "release" | "cancel", entry?: LedgerEntry) => void;
}) {
  const amount = need.bounty_tolken ?? 0;
  const live = entry && entry.status !== "refunded" && entry.status !== "cancelled" ? entry : undefined;
  const contributor = live?.contributor;
  let state = live ? ledgerStatus[live.status] : "Not funded yet";
  if (live?.status === "released" && contributor) state = `Released to ${contributor.display_name ?? contributor.handle}`;
  if (live?.status === "funded" && !contributor) state = "Funded, waiting for someone to take it on";

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">
          {need.skill.name} <span className="font-normal tabular-nums text-teal">{formatTolken(amount)}</span>
        </p>
        <p className="text-sm text-muted-ink">{state}</p>
      </div>
      {own && (
        <div className="flex gap-2">
          {(!live || live.status === "pending_funding") && (
            <button
              disabled={busy || balance < amount}
              title={balance < amount ? `You have ${formatTolken(balance)}` : undefined}
              onClick={() => onAction("fund")}
              className={btn.primary}
            >
              Fund {formatTolken(amount)}
            </button>
          )}
          {live?.status === "funded" && contributor && (
            <button disabled={busy} onClick={() => onAction("release", live)} className={btn.match}>
              Release to {contributor.display_name?.split(" ")[0] ?? contributor.handle}
            </button>
          )}
          {live && (live.status === "funded" || live.status === "pending_funding") && (
            <button disabled={busy} onClick={() => onAction("cancel", live)} className={btn.secondary}>
              Cancel
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Team and shares, plus the project's Tolken bounties. Members only. */
export function TeamView({ id }: { id: string }) {
  const { me, refreshMe } = useSession();
  const viewerId = me?.profile.id ?? null;
  const project = useApi<ProjectDetail>(`/projects/${id}`);
  const team = useApi<TeamOut>(viewerId ? `/projects/${id}/team` : null);
  const tolken = useApi<TolkenOut>(viewerId ? "/me/tolken" : null);
  const [busy, setBusy] = useState(false);

  const p = project.data;
  const own = Boolean(p && viewerId && p.owner.id === viewerId);
  const back = p && own && p.stage === "idea" ? `/projects/${id}/results` : `/projects/${id}`;

  if (project.error) {
    return project.error instanceof ApiError && project.error.status === 404 ? (
      <EmptyState
        title="Project not found"
        body="It may have been deleted, or the link is wrong."
        action={
          <Link href="/explore" className={btn.secondary}>
            Explore projects
          </Link>
        }
        className="py-24"
      />
    ) : (
      <ErrorState error={project.error} onRetry={project.reload} className="py-24" />
    );
  }

  async function setShare(profileId: string, bps: number) {
    const prev = team.data;
    if (!prev) return;
    team.mutate({
      ...prev,
      members: prev.members.map((m) => (m.profile.id === profileId ? { ...m, share_bps: bps } : m)),
      total_bps: prev.total_bps - (prev.members.find((m) => m.profile.id === profileId)?.share_bps ?? 0) + bps,
    });
    try {
      team.mutate(await api<TeamOut>(`/projects/${id}/team/${profileId}`, { method: "PATCH", body: { share_bps: bps } }));
    } catch (e) {
      team.mutate(prev);
      toast.error((e as Error).message);
    }
  }

  async function bountyAction(need: NeedOut, action: "fund" | "release" | "cancel", entry?: LedgerEntry) {
    setBusy(true);
    try {
      const path =
        action === "fund" ? `/projects/${id}/needs/${need.id}/fund` : `/tolken/${entry!.id}/${action}`;
      await api<LedgerEntry>(path, { method: "POST" });
      toast.success(
        action === "fund"
          ? `Funded ${formatTolken(need.bounty_tolken ?? 0)} for ${need.skill.name}`
          : action === "release"
            ? `Released ${formatTolken(entry!.amount_tolken)} to ${entry!.contributor?.display_name ?? entry!.contributor?.handle ?? "the contributor"}`
            : "Bounty cancelled",
      );
      tolken.reload();
      invalidate("/me");
      refreshMe();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const forbidden = team.error instanceof ApiError && team.error.status === 403;
  const members = team.data?.members ?? [];
  const joined = members.filter((m) => m.status === "joined");
  const bountyNeeds = p?.needs.filter((n) => n.bounty_tolken) ?? [];
  const ledger = (tolken.data?.ledger ?? []).filter((l) => l.project_id === id);
  const latestFor = (needId: string) =>
    ledger.filter((l) => l.need_id === needId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const stillOpen = p?.needs.filter((n) => n.status === "open" && !n.bounty_tolken) ?? [];

  return (
    <>
      <MobileHeader title={p?.title ?? "Team"} subtitle="Team and shares" back={back} />
      <div className="mx-auto max-w-[760px] px-4 py-5 lg:px-8 lg:py-7">
        <header className="hidden items-center gap-4 lg:flex">
          {p ? (
            <>
              <CoverArt cover={p.cover} seed={p.id} className="size-14 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold tracking-tight">{p.title}</h1>
                <ProjectMeta project={p} className="mt-1" />
              </div>
              <Link href={back} className={btn.secondary}>
                Back to project
              </Link>
            </>
          ) : (
            <Skeleton className="h-14 w-72 rounded-lg" />
          )}
        </header>

        {!viewerId ? (
          <EmptyState
            title="Sign in to see the team"
            action={
              <Link href="/" className={btn.primary}>
                Sign in
              </Link>
            }
            className="py-20"
          />
        ) : forbidden ? (
          <EmptyState
            title="Only team members can see this"
            body="Offer to help on one of the project's needs. Once the owner accepts, you're on the team."
            action={
              <Link href={`/projects/${id}?tab=needs`} className={btn.secondary}>
                See the needs
              </Link>
            }
            className="py-20"
          />
        ) : team.error ? (
          <ErrorState error={team.error} onRetry={team.reload} />
        ) : (
          <>
            <section aria-labelledby="team-title" className="lg:mt-7">
              <div className="flex items-baseline justify-between">
                <h2 id="team-title" className="text-[15px] font-bold">
                  Team and shares
                </h2>
                {team.data && <ShareTotal bps={team.data.total_bps} />}
              </div>
              {!team.data ? (
                <RowsSkeleton rows={3} className="mt-4" />
              ) : (
                <>
                  <ShareBar
                    className="mt-3"
                    segments={joined.map((m, i) => ({
                      bps: m.share_bps ?? 0,
                      color: SHARE_COLORS[i % SHARE_COLORS.length],
                      label: m.profile.display_name ?? m.profile.handle,
                    }))}
                  />
                  <Label className="mb-3 mt-2">
                    {own ? "Bounties with no single contributor are split by these shares." : "Only the owner can change shares."}
                  </Label>
                  <TeamList members={members} viewerId={viewerId} editable={own} onShare={setShare} />
                </>
              )}
            </section>

            {bountyNeeds.length > 0 && (
              <section aria-labelledby="bounty-title" className="mt-8">
                <div className="flex items-baseline justify-between">
                  <h2 id="bounty-title" className="text-[15px] font-bold">
                    Bounties
                  </h2>
                  {own && tolken.data && <span className="text-xs text-muted-ink">Your balance {formatTolken(tolken.data.balance)}</span>}
                </div>
                {tolken.error ? (
                  <ErrorState error={tolken.error} onRetry={tolken.reload} />
                ) : !tolken.data ? (
                  <RowsSkeleton rows={1} className="mt-4" />
                ) : (
                  <ul className="mt-2 divide-y divide-line border-y border-line">
                    {bountyNeeds.map((n) => (
                      <BountyRow
                        key={n.id}
                        need={n}
                        entry={latestFor(n.id)}
                        own={own}
                        balance={tolken.data!.balance}
                        busy={busy}
                        onAction={(a, e) => bountyAction(n, a, e)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {own && stillOpen.length > 0 && (
              <section className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">
                    Still open: {stillOpen.map((n) => n.skill.name).join(", ")}
                  </p>
                  <p className="text-sm text-muted-ink">
                    {stillOpen.some((n) => n.fitters.length)
                      ? "People on Nodal offer these skills. See who fits and invite them."
                      : "Nobody offers these yet. Share the project to reach more people."}
                  </p>
                </div>
                <Link href={`/projects/${id}/results`} className={cn(btn.match, "max-sm:w-full")}>
                  See who fits
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
