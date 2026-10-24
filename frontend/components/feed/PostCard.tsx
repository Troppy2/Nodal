"use client";

import Link from "next/link";
import { Bookmark, MessageCircle, Star } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CollabButton } from "@/components/CollabDialog";
import { ProjectMeta } from "@/components/Meta";
import { NeedRows } from "@/components/NeedRows";
import { me, peopleFit, type Project } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CoverArt } from "./CoverArt";

export function PostCard({ project }: { project: Project }) {
  const { starred, saved, toggle, comments } = useDemoStore();
  const isStarred = starred.has(project.id);
  const stars = project.stars + (isStarred ? 1 : 0);
  const commentCount = project.comments.length + (comments[project.id]?.length ?? 0);
  const href = project.stage === "idea" && project.owner.handle === me.handle ? `/projects/${project.id}/results` : `/projects/${project.id}`;
  const fit = peopleFit(project);

  return (
    <article className="border-b border-line bg-white lg:overflow-hidden lg:rounded-xl lg:border">
      <header className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <Link href={`/u/${project.owner.handle}`}>
          <Avatar person={project.owner} size={32} />
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-ink">
          <Link href={`/u/${project.owner.handle}`} className="font-semibold text-ink">
            {project.owner.handle}
          </Link>{" "}
          {project.activity}
        </p>
        <time className="shrink-0 font-mono text-[11px] text-muted-ink">{project.posted}</time>
      </header>

      <Link href={href} className="block" aria-label={project.title}>
        <CoverArt cover={project.cover} seed={project.id} className="aspect-[2/1] lg:aspect-[5/2]" />
      </Link>

      <div className="px-4 pb-3 pt-3.5">
        <Link href={href} className="text-xl font-extrabold leading-tight tracking-[-0.02em] hover:underline">
          {project.title}
        </Link>
        <ProjectMeta project={project} className="mt-1.5" />
        <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{project.summary}</p>
        {(project.stage === "idea" && (project.badges.market_verdict || project.badges.cool_score !== undefined)) && (
          <p className="mt-2 flex gap-4 font-mono text-[11px] uppercase tracking-wider text-muted-ink">
            {project.badges.market_verdict && (
              <span>
                Market <span className="text-teal">{project.badges.market_verdict}</span>
              </span>
            )}
            {project.badges.cool_score !== undefined && (
              <span>
                Cool factor <span className="text-cool">{project.badges.cool_score.toFixed(1)}</span>
              </span>
            )}
          </p>
        )}
      </div>

      {project.needs.length > 0 && (
        <div className="border-t border-line">
          <p className="px-4 pt-3 font-mono text-[11px] uppercase tracking-wider text-muted-ink">
            Looking for · {fit} {fit === 1 ? "person fits" : "people fit"}
          </p>
          <NeedRows project={project} className="mt-1" />
        </div>
      )}

      <footer className="flex items-center gap-1 border-t border-line px-2 py-1.5">
        <button
          aria-pressed={isStarred}
          aria-label={isStarred ? "Unstar" : "Star"}
          onClick={() => toggle("starred", project.id)}
          className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold hover:bg-sunken"
        >
          <Star className={cn("size-5", isStarred && "fill-ink")} strokeWidth={1.75} />
          {stars}
        </button>
        <Link
          href={`/projects/${project.id}?tab=discussion`}
          aria-label={`${commentCount} comments`}
          className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold hover:bg-sunken"
        >
          <MessageCircle className="size-5" strokeWidth={1.75} />
          {commentCount}
        </Link>
        <button
          aria-pressed={saved.has(project.id)}
          aria-label="Save"
          onClick={() => toggle("saved", project.id)}
          className="flex size-11 items-center justify-center rounded-lg hover:bg-sunken"
        >
          <Bookmark className={cn("size-5", saved.has(project.id) && "fill-ink")} strokeWidth={1.75} />
        </button>
        <div className="ml-auto pr-2">
          <CollabButton project={project} className="h-9" />
        </div>
      </footer>
    </article>
  );
}
