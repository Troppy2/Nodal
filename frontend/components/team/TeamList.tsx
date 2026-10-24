"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Member } from "@/lib/seed-team";
import { cn } from "@/lib/utils";

/** One row per member; joined members' shares are editable inline as percents when `editable`. */
export function TeamList({
  members,
  onShare,
  editable,
}: {
  members: Member[];
  onShare: (handle: string, bps: number) => void;
  editable: boolean;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {members.map((m) => {
        const invited = m.status === "invited";
        const owner = m.role === "owner";
        const first = m.person.name.split(" ")[0];
        return (
          <li key={m.person.handle} className="flex items-center gap-3 py-3">
            <Link href={`/u/${m.person.handle}`} aria-label={m.person.name}>
              <Avatar person={m.person} size={40} dashed={invited} />
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-baseline gap-2 text-[15px]">
                <span className="truncate font-semibold">{owner && editable ? "You" : m.person.name}</span>
                <span className={cn("font-mono text-[10px] uppercase tracking-wider", invited ? "text-cool" : "text-muted-ink")}>
                  {owner ? "owner" : m.status}
                </span>
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-ink">{m.skills}</p>
            </div>
            {invited ? (
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-ink">Share after joining</span>
            ) : editable ? (
              <label className="flex h-10 items-center rounded-lg border border-line pr-2.5 font-mono text-[15px] focus-within:border-ink">
                <span className="sr-only">Share for {owner ? "you" : first}, percent</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={(m.share_bps ?? 0) / 100}
                  onChange={(e) => {
                    const pct = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
                    onShare(m.person.handle, pct * 100);
                  }}
                  className="h-full w-12 bg-transparent text-right tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                %
              </label>
            ) : (
              <span className="font-mono text-[15px] tabular-nums">{(m.share_bps ?? 0) / 100}%</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
