"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { Member } from "@/lib/api-types";
import { cn } from "@/lib/utils";

/** Percent input that commits on blur or Enter, so the owner can type freely. */
function ShareInput({ value, label, onCommit }: { value: number; label: string; onCommit: (bps: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const pct = Math.max(0, Math.min(100, Math.round(Number(draft) || 0)));
    setDraft(null);
    if (pct * 100 !== value) onCommit(pct * 100);
  };
  return (
    <label className="flex h-10 items-center rounded-lg border border-line pr-2.5 text-[15px] transition-colors focus-within:border-ink hover:border-ink/30">
      <span className="sr-only">{label}, percent</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        value={draft ?? value / 100}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-full w-12 bg-transparent text-right tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      %
    </label>
  );
}

/** One row per member; joined members' shares are editable inline when `editable`. */
export function TeamList({
  members,
  viewerId,
  editable,
  onShare,
}: {
  members: Member[];
  viewerId: string | null;
  editable: boolean;
  onShare: (profileId: string, bps: number) => void;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {members.map((m) => {
        const invited = m.status === "invited";
        const isMe = m.profile.id === viewerId;
        const name = isMe ? "You" : (m.profile.display_name ?? m.profile.handle);
        return (
          <li key={m.profile.id} className="flex items-center gap-3 py-3">
            <Link href={`/u/${m.profile.handle}`} aria-label={name} className="rounded-full">
              <Avatar person={m.profile} size={40} dashed={invited} />
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-baseline gap-2 text-[15px]">
                <Link href={`/u/${m.profile.handle}`} className="truncate font-semibold hover:underline">
                  {name}
                </Link>
                <span className={cn("text-xs", invited ? "text-cool" : "text-muted-ink")}>
                  {m.role === "owner" ? "Owner" : invited ? "Invited" : "Joined"}
                </span>
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-ink">{m.skill?.name ?? (m.role === "owner" ? "Runs the project" : "Contributor")}</p>
            </div>
            {invited ? (
              <span className="text-xs text-muted-ink">Share after joining</span>
            ) : editable ? (
              <ShareInput value={m.share_bps ?? 0} label={`Share for ${name}`} onCommit={(bps) => onShare(m.profile.id, bps)} />
            ) : (
              <span className="text-[15px] tabular-nums">{(m.share_bps ?? 0) / 100}%</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
