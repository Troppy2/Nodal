"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { me } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import type { GraphNode } from "./graph-data";

/** Why the selected person fits, with the one primary action. */
export function PersonDetail({ node, canInvite }: { node: GraphNode; canInvite: boolean }) {
  const { person } = node;
  const { invited, add } = useDemoStore();
  const isMe = person.handle === me.handle;
  const sent = invited.has(person.handle);
  const first = person.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <Avatar person={person} size={44} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">
            {isMe ? "You" : person.name} <span className="font-normal text-muted-ink">@{person.handle}</span>
          </p>
          <p className="mt-1 text-sm leading-snug text-ink/80">{node.explain}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {node.chips.map((c) => (
              <li
                key={c}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium",
                  c.startsWith("Swap") || c.startsWith("Ring") ? "border-teal/40 text-teal" : "border-line text-ink",
                )}
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {!isMe && (
        <div className="flex shrink-0 gap-2">
          {canInvite &&
            (sent ? (
              <span className={cn(btn.done, "max-lg:flex-1")}>
                <Check className="size-4" /> Invited
              </span>
            ) : (
              <button
                onClick={() => {
                  add("invited", person.handle);
                  toast.success(`Invite sent to ${first}`, { description: `To build with you on ${node.skills.join(", ")}` });
                }}
                className={cn(btn.match, "max-lg:flex-1")}
              >
                Invite to build
              </button>
            ))}
          <Link href={`/u/${person.handle}`} className={cn(btn.secondary, "max-lg:flex-1")}>
            View profile
          </Link>
        </div>
      )}
    </div>
  );
}
