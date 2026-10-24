"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Label } from "@/components/Meta";
import { api } from "@/lib/api";
import type { Cycle, ProjectList } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";

function CycleRow({ cycle, meId }: { cycle: Cycle; meId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const others = cycle.members.filter((m) => m.id !== meId);
  const partner = others[0];
  const gives = cycle.links.find((l) => l.to === meId)?.skill.name;
  const gets = cycle.links.find((l) => l.from === meId)?.skill.name;
  if (!partner) return null;

  async function invite() {
    setState("sending");
    try {
      await api("/cycles/invite", { method: "POST", body: { cycle_id: cycle.id } });
      setState("sent");
      invalidate("/me/inbox");
      toast.success(cycle.kind === "swap" ? `Swap invite sent to ${partner.display_name || partner.handle}` : "Ring invite sent");
    } catch (e) {
      setState("idle");
      toast.error((e as Error).message);
    }
  }

  return (
    <li className="flex items-center gap-3">
      <Link href={`/u/${partner.handle}`} className="rounded-full">
        <Avatar person={partner} size={36} />
      </Link>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="flex items-baseline justify-between gap-2 text-sm font-semibold">
          <span className="truncate">
            {others.map((o) => o.display_name || o.handle).join(" and ")}
          </span>
          <span className="shrink-0 text-xs font-medium text-teal">{cycle.kind === "swap" ? "Swap" : "3-way ring"}</span>
        </p>
        {gives && gets && (
          <p className="flex items-center gap-1 truncate text-[13px] text-muted-ink">
            <span className="truncate">{gives}</span> <ArrowLeftRight className="size-3 shrink-0" aria-label="for" />{" "}
            <span className="truncate">{gets}</span>
          </p>
        )}
      </div>
      {state === "sent" ? (
        <span className="flex items-center gap-1 text-[13px] font-semibold text-teal">
          <Check className="size-3.5" /> Sent
        </span>
      ) : (
        <button
          className="flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-semibold text-teal transition-colors hover:bg-teal-tint"
          onClick={invite}
          disabled={state === "sending"}
        >
          {state === "sending" && <Loader2 className="size-3.5 animate-spin" />}
          Invite
        </button>
      )}
    </li>
  );
}

/** Desktop right column: you, the swaps and rings you're in, and the skills most asked for. */
export function SideSuggestions() {
  const { me, signedIn } = useSession();
  const cycles = useApi<Cycle[]>(signedIn ? "/me/cycles" : null);
  const projects = useApi<ProjectList>("/projects?page=1");

  // Most-asked skills across the newest projects' open needs.
  const counts = new Map<string, number>();
  for (const p of projects.data?.items ?? [])
    for (const n of p.needs) if (n.status === "open") counts.set(n.skill.name, (counts.get(n.skill.name) ?? 0) + 1);
  const neededMost = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);

  return (
    <aside className="sticky top-6 hidden h-fit w-[290px] shrink-0 flex-col gap-7 pt-4 xl:flex">
      {me ? (
        <Link href={`/u/${me.profile.handle}`} className="group flex items-center gap-3 rounded-lg">
          <Avatar person={me.profile} size={40} />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold group-hover:underline">{me.profile.display_name || me.profile.handle}</p>
            <p className="truncate text-[13px] text-muted-ink">
              {me.offers.length ? me.offers.map((o) => o.skill.name).join(", ") : "No skills added yet"}
            </p>
          </div>
        </Link>
      ) : (
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold">Find people for your project</p>
          <p className="mt-1 text-[13px] text-muted-ink">Sign in with your name to post ideas and get matched.</p>
          <Link href="/" className={`${btn.primary} mt-3 w-full`}>
            Sign in
          </Link>
        </div>
      )}

      {signedIn && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Label>Swaps ready for you</Label>
            <Link href="/inbox" className="text-[13px] font-semibold hover:underline">
              Inbox
            </Link>
          </div>
          {cycles.loading && !cycles.data ? (
            <div className="space-y-3" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="size-9 animate-pulse rounded-full bg-sunken" />
                  <span className="h-3 flex-1 animate-pulse rounded bg-sunken" />
                </div>
              ))}
            </div>
          ) : cycles.error && !cycles.data ? (
            <button className="text-[13px] font-semibold text-muted-ink hover:text-ink" onClick={cycles.reload}>
              Couldn&apos;t load swaps. Retry
            </button>
          ) : (cycles.data ?? []).length === 0 ? (
            <p className="text-[13px] leading-snug text-muted-ink">
              No swaps yet. Add the skills you offer and we&apos;ll find people whose projects need them.{" "}
              <Link href="/onboarding" className="font-semibold text-ink hover:underline">
                Add skills
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {(cycles.data ?? []).slice(0, 3).map((c) => (
                <CycleRow key={c.id} cycle={c} meId={me?.profile.id ?? ""} />
              ))}
            </ul>
          )}
        </section>
      )}

      {neededMost.length > 0 && (
        <section>
          <Label className="mb-3">Most needed right now</Label>
          <div className="flex flex-wrap gap-1.5">
            {neededMost.map((s) => (
              <Link
                key={s}
                href={`/explore?q=${encodeURIComponent(s)}`}
                className="rounded-md border border-line px-2.5 py-1 text-[13px] font-medium transition-colors hover:border-ink"
              >
                {s}
              </Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
