"use client";

import { formatTolken } from "@/lib/cover";
import { fittersFor, me, type Project, viewerFits } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./AvatarStack";
import { requestKey } from "./CollabDialog";

/**
 * Open needs with who can fill each one. A teal row means you can.
 * This is the core of a post: what's missing and who fits.
 */
export function NeedRows({ project, className }: { project: Project; className?: string }) {
  const { requested } = useDemoStore();
  if (project.needs.length === 0) return null;
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {project.needs.map((n) => {
        const fits = viewerFits(project, n);
        const sent = requested.has(requestKey(project.id, n.skill));
        const others = fittersFor(project, n.skill).filter((p) => !fits || p.handle !== me.handle);
        return (
          <li key={n.skill} className={cn("flex items-center gap-3 py-2.5 pl-3 pr-3", fits && "bg-teal-tint/60")}>
            <span aria-hidden className={cn("h-8 w-[3px] shrink-0 rounded-full", fits ? "bg-teal" : "bg-line")} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
                {n.skill}
                {n.bounty_tolken && <span className="font-mono text-xs font-medium text-teal">{formatTolken(n.bounty_tolken)} bounty</span>}
              </p>
              <p className="truncate text-[13px] text-muted-ink">{n.note}</p>
            </div>
            {fits ? (
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-teal">{sent ? "Requested" : "You fit"}</span>
            ) : others.length > 0 ? (
              <AvatarStack people={others} />
            ) : (
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-ink">No match yet</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
