"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { CoverArt } from "@/components/feed/CoverArt";
import { ProjectMeta } from "@/components/Meta";
import type { ProjectCard } from "@/lib/api-types";
import { formatTolken, TOLKEN } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Grid tile used by Explore and profiles: cover, title, meta line, what it needs, owner and stars. */
export function ProjectTile({ project, showOwner = true }: { project: ProjectCard; showOwner?: boolean }) {
  const { me } = useSession();
  const own = me?.profile.id === project.owner.id;
  const href = project.stage === "idea" && own ? `/projects/${project.id}/results` : `/projects/${project.id}`;
  const open = project.needs.filter((n) => n.status === "open");
  const totalBounty = open.reduce((sum, n) => sum + (n.bounty_tolken || 0), 0);

  return (
    <Link href={href} className="group flex flex-col rounded-lg">
      <div className="relative overflow-hidden rounded-lg">
        <CoverArt
          cover={project.cover}
          coverUrl={project.cover_url}
          seed={project.id}
          className="aspect-[4/3] rounded-lg transition-[filter] duration-150 group-hover:brightness-[0.96]"
        />
        {totalBounty > 0 && (
          <span className="absolute top-2 right-2 rounded-md bg-teal/95 backdrop-blur-xs px-2 py-0.5 text-[11px] font-black text-white shadow-xs flex items-center gap-1">
            <span>{TOLKEN}</span> {totalBounty} bounty
          </span>
        )}
      </div>

      <h3 className="mt-2.5 text-[15px] font-bold leading-tight group-hover:underline">{project.title}</h3>
      <ProjectMeta project={project} className="mt-1 gap-x-2" />
      {open.length > 0 ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted-ink">
          Needs{" "}
          {open.map((n, i) => (
            <span key={n.id}>
              {i > 0 && ", "}
              <span className={cn(n.viewer_fits ? "font-semibold text-teal" : "text-ink")}>
                {n.skill.name}
                {n.bounty_tolken ? (
                  <span className="font-semibold text-teal"> ({formatTolken(n.bounty_tolken)})</span>
                ) : null}
              </span>
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] text-muted-ink">Not looking for help</p>
      )}
      <p className="mt-1.5 flex items-center gap-3 text-xs text-muted-ink">
        {showOwner && <span className="truncate">{project.owner.display_name || project.owner.handle}</span>}
        <span className="flex shrink-0 items-center gap-0.5">
          <Star className="size-3" strokeWidth={2} aria-label="stars" /> {project.star_count}
        </span>
      </p>
    </Link>
  );
}

export function ProjectGrid({ projects, showOwner }: { projects: ProjectCard[]; showOwner?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:gap-x-5 lg:gap-y-8">
      {projects.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProjectTile project={p} showOwner={showOwner} />
        </li>
      ))}
    </ul>
  );
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:gap-x-5 lg:gap-y-8" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="aspect-[4/3] animate-pulse rounded-lg bg-sunken" />
          <div className="mt-2.5 h-4 w-2/3 animate-pulse rounded bg-sunken" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-sunken" />
        </li>
      ))}
    </ul>
  );
}
