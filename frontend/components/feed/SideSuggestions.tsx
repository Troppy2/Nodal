"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Label } from "@/components/Meta";
import { api } from "@/lib/api";
import type { Cycle, ProjectList } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

function CycleRow({ cycle, meId }: { cycle: Cycle; meId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const others = cycle.members.filter((m) => m.id !== meId);
  const partner = others[0];
  // An edge from me fills their project (I give that skill); an edge to me fills mine (I get it).
  const iGive = cycle.links.find((l) => l.from === meId)?.skill.name;
  const iGet = cycle.links.find((l) => l.to === meId)?.skill.name;
  if (!partner) return null;

  async function invite() {
    setState("sending");
    try {
      await api("/cycles/invite", { method: "POST", body: { cycle_id: cycle.id } });
      setState("sent");
      invalidate("/me/inbox", "/me/cycles");
      toast.success(cycle.kind === "swap" ? `Swap invite sent to ${partner.display_name || partner.handle}` : "Ring invite sent");
    } catch (e) {
      setState("idle");
      toast.error((e as Error).message);
    }
  }

  const partnerNames = others.map((o) => (o.display_name || o.handle).split(" ")[0]).join(" & ");

  return (
    <li className="flex items-start gap-2.5 py-2.5 border-b border-line/60 last:border-b-0">
      <Link href={`/u/${partner.handle}`} className="shrink-0 rounded-full mt-0.5">
        <Avatar person={partner} size={34} ring={cycle.kind === "ring"} />
      </Link>
      <div className="min-w-0 flex-1 leading-snug">
        {/* Name and Collaboration Type Badge aligned together */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href={`/u/${partner.handle}`}
            className="truncate text-[13px] font-bold text-ink hover:underline"
          >
            {partnerNames}
          </Link>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 border",
              cycle.kind === "swap"
                ? "bg-teal-tint text-teal border-teal/20"
                : "bg-purple-500/10 text-purple-600 border-purple-500/20",
            )}
          >
            {cycle.kind === "swap" ? "Swap" : "3-Way Ring"}
          </span>
        </div>

        {/* Structured skill trade exchange */}
        {iGive && iGet && (
          <div className="mt-1 flex flex-col gap-0.5 text-[11px] leading-tight text-muted-ink">
            <span className="truncate">
              Give <span className="font-medium text-ink">{iGive}</span>
            </span>
            <span className="truncate">
              Get <span className="font-medium text-ink">{iGet}</span>
            </span>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="shrink-0 self-center">
        {state === "sent" ? (
          <span className="flex items-center gap-1 text-xs font-bold text-teal">
            <Check className="size-3.5" /> Sent
          </span>
        ) : (
          <button
            className={cn(btn.match, "h-7 px-2.5 text-xs font-bold shadow-2xs")}
            onClick={invite}
            disabled={state === "sending"}
          >
            {state === "sending" && <Loader2 className="size-3 animate-spin mr-1" />}
            Invite
          </button>
        )}
      </div>
    </li>
  );
}

const card = "rounded-xl border border-line bg-white p-4";

/** Desktop right column: you, the swaps and rings you're in, and the skills most asked for. */
export function SideSuggestions() {
  const { me, signedIn } = useSession();
  const cycles = useApi<Cycle[]>(signedIn ? "/me/cycles" : null);
  const projects = useApi<ProjectList>("/projects?page=1");

  // Most-asked skills across the newest projects' open needs.
  const counts = new Map<string, number>();
  for (const p of projects.data?.items ?? [])
    for (const n of p.needs) if (n.status === "open") counts.set(n.skill.name, (counts.get(n.skill.name) ?? 0) + 1);
  const neededMost = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const cycleList = cycles.data ?? [];

  return (
    <aside className="sticky top-6 hidden h-fit w-[300px] shrink-0 flex-col gap-3 pt-6 xl:flex">
      {me ? (
        <section className={card}>
          <Link href={`/u/${me.profile.handle}`} className="group flex items-center gap-3">
            <Avatar person={me.profile} size={40} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold group-hover:underline">{me.profile.display_name || me.profile.handle}</p>
              <p className="truncate text-xs text-muted-ink">@{me.profile.handle}</p>
            </div>
          </Link>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {me.offers.slice(0, 3).map((o) => (
              <span key={o.skill.id} className="rounded-md border border-line px-2 py-0.5 text-xs font-medium">
                {o.skill.name}
              </span>
            ))}
            {me.offers.length > 3 && (
              <span className="rounded-md border border-dashed border-line px-2 py-0.5 text-xs text-muted-ink">
                +{me.offers.length - 3}
              </span>
            )}
            {me.offers.length === 0 && <span className="text-xs text-muted-ink">No skills yet</span>}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
            <Link href="/onboarding" className="text-xs font-semibold text-muted-ink hover:text-ink">
              Edit skills
            </Link>
            <Link href={`/u/${me.profile.handle}`} className="flex items-center gap-0.5 text-xs font-semibold text-teal hover:underline">
              Profile <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </section>
      ) : (
        <section className={card}>
          <p className="text-sm font-semibold">Find people for your project</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-ink">Sign in with your name to post ideas and get matched.</p>
          <Link href="/" className={`${btn.primary} mt-3 h-9 w-full`}>
            Sign in
          </Link>
        </section>
      )}

      {signedIn && (
        <section className={card}>
          <div className="mb-2.5 flex items-baseline justify-between">
            <Label>Swaps ready for you</Label>
            {cycleList.length > 0 && (
              <Link href="/requests" className="text-xs font-semibold text-muted-ink hover:text-ink">
                All Requests
              </Link>
            )}
          </div>
          {cycles.loading && !cycles.data ? (
            <div className="space-y-3" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="size-8 animate-pulse rounded-full bg-sunken" />
                  <span className="h-3 flex-1 animate-pulse rounded bg-sunken" />
                </div>
              ))}
            </div>
          ) : cycles.error && !cycles.data ? (
            <button className="text-xs font-semibold text-muted-ink hover:text-ink" onClick={cycles.reload}>
              Couldn&apos;t load swaps. Retry
            </button>
          ) : cycleList.length === 0 ? (
            <div>
              <p className="text-xs leading-relaxed text-muted-ink">
                No swaps yet. Add the skills you offer and we&apos;ll find people whose projects need them.
              </p>
              <Link href="/onboarding" className={`${btn.secondary} mt-2.5 h-8 w-full text-xs`}>
                Add your skills
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col">
              {cycleList.slice(0, 3).map((c) => (
                <CycleRow key={c.id} cycle={c} meId={me?.profile.id ?? ""} />
              ))}
            </ul>
          )}
        </section>
      )}

      {neededMost.length > 0 && (
        <section className={card}>
          <Label className="mb-2.5">Most needed right now</Label>
          <ul className="flex flex-wrap gap-1.5">
            {neededMost.map(([skill, n]) => (
              <li key={skill}>
                <Link
                  href={`/explore?q=${encodeURIComponent(skill)}`}
                  className="flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-xs font-medium transition-colors hover:border-ink"
                >
                  {skill}
                  <span className="font-mono text-[11px] text-muted-ink">{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
