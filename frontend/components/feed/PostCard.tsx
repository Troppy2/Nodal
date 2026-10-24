"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { CollabButton } from "@/components/CollabDialog";
import { ProjectMeta } from "@/components/Meta";
import { timeAgo } from "@/components/project/states";
import { api } from "@/lib/api";
import type { NeedOut, ProjectCard } from "@/lib/api-types";
import { formatTolken } from "@/lib/cover";
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

function NeedChip({ need }: { need: NeedOut }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        need.viewer_fits ? "border-teal/40 bg-teal-tint text-teal" : "border-line text-ink",
      )}
      title={need.note ?? undefined}
    >
      <span className="truncate">{need.skill.name}</span>
      {need.bounty_tolken ? (
        <span className={cn("shrink-0 font-mono text-[11px]", need.viewer_fits ? "text-teal" : "text-muted-ink")}>
          {formatTolken(need.bounty_tolken)}
        </span>
      ) : null}
    </span>
  );
}

export function PostCard({ project }: { project: ProjectCard }) {
  const { me } = useSession();
  const { starred, count, toggle } = useStar(project);
  const own = me?.profile.id === project.owner.id;
  const href = project.stage === "idea" && own ? `/projects/${project.id}/results` : `/projects/${project.id}`;
  const ownerName = project.owner.display_name || project.owner.handle;
  const fit = project.people_fit;
  const { market_verdict, cool_score } = project.badges;
  const needs = project.needs.filter((n) => n.status === "open");
  const shownNeeds = needs.slice(0, 4);

  return (
    <article className="focus-inset mx-4 overflow-hidden rounded-xl border border-line bg-white lg:mx-0">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4 lg:px-5">
        <Link href={`/u/${project.owner.handle}`} aria-label={ownerName} className="shrink-0 rounded-full">
          <Avatar person={project.owner} size={36} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm text-muted-ink">
            <Link href={`/u/${project.owner.handle}`} className="font-semibold text-ink hover:underline">
              {ownerName}
            </Link>{" "}
            {activity[project.stage]}
          </p>
          <p className="mt-0.5 text-xs text-muted-ink">
            <time dateTime={project.created_at}>{timeAgo(project.created_at)}</time>
          </p>
        </div>
      </header>

      <Link href={href} className="group block" aria-label={project.title}>
        <CoverArt
          cover={project.cover}
          coverUrl={project.cover_url}
          seed={project.id}
          className="aspect-[2/1] transition-[filter] duration-150 group-hover:brightness-[0.96] lg:aspect-[5/2]"
        />
      </Link>

      <div className="px-4 pb-4 pt-3.5 lg:px-5">
        <Link href={href} className="text-[19px] font-extrabold leading-tight tracking-[-0.02em] hover:underline lg:text-xl">
          {project.title}
        </Link>
        <ProjectMeta project={project} className="mt-1.5" />
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/80">{project.summary}</p>
        {project.stage === "idea" && (market_verdict || cool_score !== null) && (
          <p className="mt-2.5 flex gap-4 text-xs text-muted-ink">
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

      {needs.length > 0 && (
        <div className="border-t border-line px-4 py-3 lg:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold">Needs</p>
            {fit > 0 && (
              <p className="text-xs text-muted-ink">
                {fit} {fit === 1 ? "person fits" : "people fit"}
              </p>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shownNeeds.map((n) => (
              <NeedChip key={n.id} need={n} />
            ))}
            {needs.length > shownNeeds.length && (
              <Link
                href={`/projects/${project.id}?tab=needs`}
                className="inline-flex items-center rounded-md border border-dashed border-line px-2 py-1 text-xs font-medium text-muted-ink hover:border-ink hover:text-ink"
              >
                +{needs.length - shownNeeds.length} more
              </Link>
            )}
          </div>
        </div>
      )}

      <footer className="flex items-center gap-1 border-t border-line px-2 py-1.5 lg:px-3">
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
        <div className="ml-auto pr-1">
          <CollabButton project={project} className="h-9" />
        </div>
      </footer>
    </article>
  );
}

/** Same footprint as a PostCard while the feed loads. */
export function PostCardSkeleton() {
  return (
    <div className="mx-4 overflow-hidden rounded-xl border border-line lg:mx-0" aria-hidden>
      <div className="flex items-center gap-3 px-4 pb-3 pt-4 lg:px-5">
        <span className="size-9 animate-pulse rounded-full bg-sunken" />
        <div className="flex-1 space-y-1.5">
          <span className="block h-3 w-36 animate-pulse rounded bg-sunken" />
          <span className="block h-2.5 w-16 animate-pulse rounded bg-sunken" />
        </div>
      </div>
      <div className="aspect-[2/1] animate-pulse bg-sunken lg:aspect-[5/2]" />
      <div className="space-y-2 px-4 py-4 lg:px-5">
        <span className="block h-5 w-1/2 animate-pulse rounded bg-sunken" />
        <span className="block h-3 w-1/3 animate-pulse rounded bg-sunken" />
        <span className="block h-3 w-5/6 animate-pulse rounded bg-sunken" />
      </div>
    </div>
  );
}
