"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { InboxItem, ProfileLite, Response } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { displayName, joinNames, waitingOn } from "./format";

const responseText: Record<Response, string> = { pending: "Pending", accepted: "Accepted", declined: "Declined" };

/**
 * A swap or ring invite: one row per link ("You, UI design, for Dev's Dungeon Drift"),
 * every member's answer, and the viewer's actions.
 */
export function RingInviteCard({
  item,
  me,
  busy,
  onRespond,
}: {
  item: InboxItem;
  me: ProfileLite | null;
  busy: boolean;
  onRespond: (response: "accepted" | "declined") => void;
}) {
  const people = new Map<string, ProfileLite>(item.people.map((p) => [p.id, p]));
  if (me) people.set(me.id, me);
  const nameOf = (id: string) => (id === me?.id ? "You" : displayName(people.get(id) ?? { handle: "someone", display_name: null }));
  const possessive = (id: string) => (id === me?.id ? "your" : `${nameOf(id)}'s`);
  const label = item.kind === "swap" ? "swap" : "ring";
  const myProject = item.links.find((l) => l.to === me?.id);
  const waiting = waitingOn(item, me?.id ?? null);

  return (
    <div className="focus-inset overflow-hidden rounded-xl border border-line">
      <div className="bg-teal-tint/30 border-b border-teal/20 px-4 py-2.5 text-xs text-ink/80 flex items-start gap-2">
        <span className="font-bold text-teal shrink-0">
          {item.kind === "swap" ? "Swap:" : "Ring:"}
        </span>
        <span>
          {item.kind === "swap"
            ? "You and one person fill each other's needs. When both accept, you each join the other's team. No Tolken changes hands."
            : "Three people, each helps the next. When all three accept, everyone joins the team they help. No Tolken changes hands."}
        </span>
      </div>
      <ul className="divide-y divide-line">
        {item.links.map((l) => {
          const from = people.get(l.from);
          const r = item.responses[l.from] ?? "pending";
          return (
            <li key={`${l.from}-${l.project_id}`} className="flex items-center gap-3 px-4 py-3">
              {from ? <Avatar person={from} size={32} /> : <span className="size-8 shrink-0 rounded-full bg-sunken" />}
              <p className="min-w-0 flex-1 text-[15px] leading-snug">
                <span className="font-semibold">{nameOf(l.from)}</span>
                <ArrowRight className="mx-1.5 inline size-3.5 text-muted-ink" aria-label="does" />
                {l.skill.name}
                <ArrowRight className="mx-1.5 inline size-3.5 text-muted-ink" aria-label="for" />
                <Link href={`/projects/${l.project_id}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">
                  {possessive(l.to)} {l.project_title}
                </Link>
              </p>
              <span className={cn("shrink-0 text-xs", r === "accepted" ? "text-teal" : r === "declined" ? "text-cool" : "text-muted-ink")}>
                {responseText[r]}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line bg-sunken/60 px-4 py-3">
        {item.actions.length > 0 ? (
          <div className="flex gap-2 max-sm:flex-col">
            <button disabled={busy} onClick={() => onRespond("accepted")} className={cn(btn.match, "max-sm:w-full")}>
              Accept {label}
            </button>
            <button disabled={busy} onClick={() => onRespond("declined")} className={cn(btn.secondary, "max-sm:w-full")}>
              Decline
            </button>
          </div>
        ) : item.status === "accepted" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-teal">
              <Check className="size-4" /> Everyone accepted the {label}
            </p>
            {myProject && (
              <Link href={`/projects/${myProject.project_id}/team`} className={btn.secondary}>
                Open team for {myProject.project_title}
              </Link>
            )}
          </div>
        ) : item.status === "declined" ? (
          <p className="flex items-center gap-2 text-sm text-muted-ink">
            <X className="size-4" /> The {label} was declined
          </p>
        ) : (
          <p className="text-sm text-muted-ink">
            {item.responses[me?.id ?? ""] === "accepted" ? "You accepted. " : ""}
            Waiting on {joinNames(waiting) || "the others"}.
          </p>
        )}
      </div>
    </div>
  );
}
