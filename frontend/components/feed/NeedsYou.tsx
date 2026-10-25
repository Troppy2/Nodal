"use client";

import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/project/states";
import type { ProjectCard, Skill } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { PostCard, PostCardSkeleton } from "./PostCard";

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
