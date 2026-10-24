"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { firstName } from "@/components/checks/States";
import type { ProjectDetail } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import type { PersonNode } from "./graph-data";
import { InviteDialog } from "./InviteDialog";

/** Why the selected person fits, with the one primary action. */
export function PersonDetail({
  node,
  isOwner,
  viewerId,
  project,
}: {
  node: PersonNode;
  isOwner: boolean;
  viewerId: string | null;
  project: Pick<ProjectDetail, "id" | "title" | "needs">;
}) {
  const { profile } = node;
  const isMe = profile.id === viewerId;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState(false);
  const need = project.needs.find((n) => node.skills.includes(n.skill.name)) ?? null;
  const explain = isMe
    ? `You offer ${node.skills.join(" and ")}.`
    : node.kind === "swap"
      ? `${firstName(profile)} fills ${node.skills.join(" and ")}, and you can help with one of their projects too.`
      : node.kind === "ring"
        ? `${firstName(profile)} fills ${node.skills.join(" and ")} as part of a three-way ring.`
        : `${firstName(profile)} offers ${node.skills.join(" and ")}.`;
  const chips = [...node.reasons, ...(node.kind === "swap" && !node.reasons.some((r) => /swap/i.test(r)) ? ["Swap"] : []), ...(node.kind === "ring" ? ["Ring"] : [])];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <Avatar person={profile} size={44} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">
            {isMe ? "You" : (profile.display_name ?? profile.handle)}{" "}
            <span className="font-normal text-muted-ink">@{profile.handle}</span>
          </p>
          <p className="mt-1 text-sm leading-snug text-ink/80">{explain}</p>
          {chips.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li
                  key={c}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium",
                    /swap|ring/i.test(c) ? "border-teal/40 text-teal" : "border-line text-ink",
                  )}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {!isMe && (
        <div className="flex shrink-0 gap-2">
          {isOwner &&
            (invited ? (
              <span className={cn(btn.done, "max-lg:flex-1")}>
                <Check className="size-4" /> Invited
              </span>
            ) : (
              <button onClick={() => setInviteOpen(true)} className={cn(btn.match, "max-lg:flex-1")}>
                Invite to build
              </button>
            ))}
          <Link href={`/u/${profile.handle}`} className={cn(btn.secondary, "max-lg:flex-1")}>
            View profile
          </Link>
        </div>
      )}
      {isOwner && (
        <InviteDialog
          project={project}
          person={profile}
          need={need}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onInvited={() => setInvited(true)}
        />
      )}
    </div>
  );
}
