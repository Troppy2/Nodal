"use client";

import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/project/states";
import type { ProjectCard, Skill } from "@/lib/api-types";
import { tints, typeLabel } from "@/lib/cover";
import { btn, cardHover } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { CoverArt } from "./CoverArt";
import { PostCard, PostCardSkeleton } from "./PostCard";

interface Intersection {
  project: ProjectCard;
  other: ProjectCard;
  shared_tags: string[];
}

interface ProjectMatch {
  project: ProjectCard;
  skill: Skill;
  score: number;
  reasons: string[];
}

function Skeletons() {
  return (
    <div className="flex flex-col gap-3 pt-3 lg:gap-5 lg:pt-4">
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}

function Side({ project }: { project: ProjectCard }) {
  const tint = tints[project.type];
  return (
    <Link href={`/projects/${project.id}`} className="group flex min-w-0 flex-1 flex-col gap-2">
      <CoverArt cover={project.cover} seed={project.id} coverUrl={project.cover_url} className="aspect-[16/9] rounded-lg" />
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: tint.fg }}>
        {typeLabel[project.type]}
      </span>
      <span className="truncate text-sm font-bold group-hover:underline">{project.title}</span>
      <span className="line-clamp-2 text-xs text-muted-ink">{project.summary}</span>
    </Link>
  );
}

/** Pairs of projects from different worlds (software, hardware, creative) that share a tag. */
export function IntersectionList() {
  const { data, error, loading, reload } = useApi<Intersection[]>("/feed/intersections");
  if (loading && !data) return <Skeletons />;
  if (error && !data) return <ErrorState className="m-4 lg:mx-0" message={error.message} onRetry={reload} />;
  if (!data?.length) {
    return (
      <EmptyState className="m-4 lg:mx-0" action={<Link href="/create" className={btn.primary}>Post an idea</Link>}>
        No intersections yet. They appear when projects of different types share a tag.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-3 pt-3 lg:gap-5 lg:pt-4">
      <p className="px-4 text-[13px] text-muted-ink lg:px-0">
        Projects from different worlds working on the same thing. Each pair could help the other.
      </p>
      {data.map((x) => (
        <article key={`${x.project.id}-${x.other.id}`} className={cn("border-y border-line bg-white p-4 lg:rounded-xl lg:border", cardHover)}>
          <div className="flex items-stretch gap-3">
            <Side project={x.project} />
            <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 px-1">
              <span className="text-lg font-bold text-teal">⨯</span>
              {x.shared_tags.map((t) => (
                <span key={t} className="rounded-full bg-teal-tint px-2 py-0.5 font-mono text-[11px] text-teal">
                  #{t}
                </span>
              ))}
            </div>
            <Side project={x.other} />
          </div>
        </article>
      ))}
    </div>
  );
}

/** The mirror of matching: projects whose open needs the viewer can fill. */
export function NeedsYouList() {
  const { data, error, loading, reload } = useApi<ProjectMatch[]>("/me/matches");
  if (loading && !data) return <Skeletons />;
  if (error && !data) return <ErrorState className="m-4 lg:mx-0" message={error.message} onRetry={reload} />;
  if (!data?.length) {
    return (
      <EmptyState className="m-4 lg:mx-0" action={<Link href="/onboarding" className={btn.secondary}>Add skills</Link>}>
        No open needs match your skills yet. Add the skills you offer and projects that need them show up here.
      </EmptyState>
    );
  }
  // One card per project, keeping its best-scoring need.
  const seen = new Set<string>();
  const rows = data.filter((m) => !seen.has(m.project.id) && seen.add(m.project.id));
  return (
    <div className="flex flex-col gap-3 pt-3 lg:gap-5 lg:pt-4">
      {rows.map((m) => (
        <div key={m.project.id} className="flex flex-col">
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 text-xs lg:px-0">
            <span className="rounded-md bg-teal-tint px-2 py-1 font-semibold text-teal">Needs your {m.skill.name}</span>
            {m.reasons.slice(1).map((r) => (
              <span key={r} className="text-muted-ink">· {r}</span>
            ))}
          </div>
          <PostCard project={m.project} />
        </div>
      ))}
    </div>
  );
}
