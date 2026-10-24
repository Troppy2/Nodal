"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { CollabButton } from "@/components/CollabDialog";
import { ProjectMeta } from "@/components/Meta";
import { NeedRows } from "@/components/NeedRows";
import { timeAgo } from "@/components/project/states";
import { api } from "@/lib/api";
import type { ProjectCard } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CoverArt } from "./CoverArt";

const activity = { idea: "posted an idea", building: "is building", shipped: "shipped" } as const;

/** Star toggle with optimistic count; reverts if the API refuses. */
export function useStar(project: ProjectCard) {
  const { signedIn } = useSession();
  const [starred, setStarred] = useState(project.viewer_starred);
  const [count, setCount] = useState(project.star_count);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      toast("Sign in to star projects", { action: { label: "Sign in", onClick: () => (window.location.href = "/") } });
      return;
    }
    if (busy) return;
    const next = !starred;
    setBusy(true);
    setStarred(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const res = await api<{ count?: number }>(`/projects/${project.id}/star`, { method: next ? "POST" : "DELETE" });
      if (typeof res?.count === "number") setCount(res.count);
    } catch (e) {
      setStarred(!next);
      setCount((c) => c + (next ? -1 : 1));
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { starred, count, toggle };
}

export function PostCard({ project }: { project: ProjectCard }) {
  const { me } = useSession();
  const { starred, count, toggle } = useStar(project);
  const own = me?.profile.id === project.owner.id;
  const href = project.stage === "idea" && own ? `/projects/${project.id}/results` : `/projects/${project.id}`;
  const ownerName = project.owner.display_name || project.owner.handle;
  const fit = project.people_fit;
  const { market_verdict, cool_score } = project.badges;

  return (
    <article className="focus-inset border-b border-line bg-white lg:overflow-hidden lg:rounded-xl lg:border">
      <header className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <Link href={`/u/${project.owner.handle}`} aria-label={ownerName} className="rounded-full">
          <Avatar person={project.owner} size={32} />
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-ink">
          <Link href={`/u/${project.owner.handle}`} className="font-semibold text-ink hover:underline">
            {ownerName}
          </Link>{" "}
          {activity[project.stage]}
        </p>
        <time dateTime={project.created_at} className="shrink-0 text-xs text-muted-ink">
          {timeAgo(project.created_at)}
        </time>
      </header>

      <Link href={href} className="group block" aria-label={project.title}>
        <CoverArt
          cover={project.cover}
          coverUrl={project.cover_url}
          seed={project.id}
          className="aspect-[2/1] transition-[filter] duration-150 group-hover:brightness-[0.96] lg:aspect-[5/2]"
        />
      </Link>

      <div className="px-4 pb-3 pt-3.5">
        <Link href={href} className="text-xl font-extrabold leading-tight tracking-[-0.02em] hover:underline">
          {project.title}
        </Link>
        <ProjectMeta project={project} className="mt-1.5" />
        <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{project.summary}</p>
        {project.stage === "idea" && (market_verdict || cool_score !== null) && (
          <p className="mt-2 flex gap-4 text-xs text-muted-ink">
            {market_verdict && (
              <span>
                Market <span className="font-semibold text-teal">{market_verdict}</span>
              </span>
            )}
            {cool_score !== null && (
              <span>
                Cool factor <span className="font-semibold text-cool">{cool_score.toFixed(1)}</span>
              </span>
            )}
          </p>
        )}
      </div>

      {project.needs.some((n) => n.status === "open") && (
        <div className="border-t border-line">
          <p className="px-4 pt-3 text-xs text-muted-ink">
            Looking for help
            {fit > 0 && (
              <>
                , {fit} {fit === 1 ? "person fits" : "people fit"}
              </>
            )}
          </p>
          <NeedRows project={project} className="mt-1" />
        </div>
      )}

      <footer className="flex items-center gap-1 border-t border-line px-2 py-1.5">
        <button
          aria-pressed={starred}
          aria-label={starred ? "Unstar" : "Star"}
          onClick={toggle}
          className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors hover:bg-sunken"
        >
          <Star className={cn("size-5", starred && "fill-ink")} strokeWidth={1.75} />
          {count}
        </button>
        <Link
          href={`/projects/${project.id}?tab=discussion`}
          aria-label={`${project.comment_count} comments`}
          className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors hover:bg-sunken"
        >
          <MessageCircle className="size-5" strokeWidth={1.75} />
          {project.comment_count}
        </Link>
        <div className="ml-auto pr-2">
          <CollabButton project={project} className="h-9" />
        </div>
      </footer>
    </article>
  );
}

/** Same footprint as a PostCard while the feed loads. */
export function PostCardSkeleton() {
  return (
    <div className="border-b border-line lg:rounded-xl lg:border" aria-hidden>
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="size-8 animate-pulse rounded-full bg-sunken" />
        <span className="h-3 w-40 animate-pulse rounded bg-sunken" />
      </div>
      <div className="aspect-[2/1] animate-pulse bg-sunken lg:aspect-[5/2]" />
      <div className="space-y-2 px-4 py-4">
        <span className="block h-5 w-1/2 animate-pulse rounded bg-sunken" />
        <span className="block h-3 w-1/3 animate-pulse rounded bg-sunken" />
        <span className="block h-3 w-5/6 animate-pulse rounded bg-sunken" />
      </div>
    </div>
  );
}
