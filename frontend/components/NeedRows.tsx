import type { ProjectCard } from "@/lib/api-types";
import { formatTolken } from "@/lib/cover";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./AvatarStack";

/**
 * Open needs with who can fill each one. A teal row means you can.
 * This is the core of a post: what's missing and who fits.
 */
export function NeedRows({ project, className }: { project: ProjectCard; className?: string }) {
  const needs = project.needs.filter((n) => n.status === "open");
  if (needs.length === 0) return null;
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {needs.map((n) => {
        // The API puts the viewer first among fitters; show the others as faces.
        const others = n.viewer_fits ? n.fitters.slice(1) : n.fitters;
        return (
          <li key={n.id} className={cn("flex items-center gap-3 py-2.5 pl-3 pr-3", n.viewer_fits && "bg-teal-tint/60")}>
            <span aria-hidden className={cn("h-8 w-[3px] shrink-0 rounded-full", n.viewer_fits ? "bg-teal" : "bg-line")} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
                {n.skill.name}
                {n.bounty_tolken && <span className="text-xs font-medium text-teal">{formatTolken(n.bounty_tolken)} bounty</span>}
              </p>
              {n.note && <p className="truncate text-[13px] text-muted-ink">{n.note}</p>}
            </div>
            {n.viewer_fits ? (
              <span className="shrink-0 text-xs font-semibold text-teal">{n.viewer_requested ? "Requested" : "You fit"}</span>
            ) : others.length > 0 ? (
              <AvatarStack people={others} />
            ) : (
              <span className="shrink-0 text-xs text-muted-ink">No match yet</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
