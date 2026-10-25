"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Plus, Star, Users, ArrowUpRight } from "lucide-react";
import { CoverArt } from "@/components/feed/CoverArt";
import { ProjectMeta } from "@/components/Meta";
import { EmptyState, ErrorState } from "@/components/checks/States";
import { formatTolken, TOLKEN } from "@/lib/cover";
import type { MyProjectsOut, ProjectCard } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

type ProjectTab = "all" | "owned" | "contributing";

function MyProjectCard({
  project,
  isOwner,
  skillName,
}: {
  project: ProjectCard;
  isOwner: boolean;
  skillName?: string | null;
}) {
  const openNeeds = project.needs.filter((n) => n.status === "open");
  const totalBounty = openNeeds.reduce((sum, n) => sum + (n.bounty_tolken || 0), 0);
  const href = project.stage === "idea" && isOwner ? `/projects/${project.id}/results` : `/projects/${project.id}`;

  return (
    <div className="group flex flex-col rounded-2xl border border-line bg-white p-4 shadow-xs transition-all hover:border-line hover:shadow-md">
      <Link href={href} className="relative block overflow-hidden rounded-xl">
        <CoverArt
          cover={project.cover}
          coverUrl={project.cover_url}
          seed={project.id}
          className="aspect-[16/9] w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {isOwner ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-ink/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
              <Crown className="size-3 text-amber-400" /> Project Owner
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal/95 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
              <Users className="size-3" /> Contributor {skillName ? `· ${skillName}` : ""}
            </span>
          )}
        </div>
        {totalBounty > 0 && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-teal/95 backdrop-blur-xs px-2.5 py-1 text-[11px] font-black text-white shadow-xs flex items-center gap-1">
            <span>{TOLKEN}</span> {totalBounty} bounty
          </span>
        )}
      </Link>

      <div className="mt-3.5 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0 flex-1">
            <h3 className="truncate text-base font-extrabold text-ink group-hover:underline">
              {project.title}
            </h3>
          </Link>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-ink">
            <Star className="size-3.5 fill-amber-500/20 text-amber-500" />
            <span className="font-semibold">{project.star_count}</span>
          </span>
        </div>

        <ProjectMeta project={project} className="mt-1 gap-x-2" />

        <p className="mt-2 line-clamp-2 text-xs text-muted-ink leading-relaxed">
          {project.summary}
        </p>

        {openNeeds.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-ink">
            <span className="font-semibold text-ink">Needs:</span>
            {openNeeds.slice(0, 3).map((n) => (
              <span key={n.id} className="rounded-md bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink">
                {n.skill.name}
                {n.bounty_tolken ? (
                  <span className="font-semibold text-teal"> ({formatTolken(n.bounty_tolken)})</span>
                ) : null}
              </span>
            ))}
            {openNeeds.length > 3 && <span className="text-[11px]">+{openNeeds.length - 3} more</span>}
          </div>
        ) : (
          <div className="mt-3 text-xs text-muted-ink font-medium">
            Team complete
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-line/70 flex items-center justify-between gap-2">
          <Link
            href={`/projects/${project.id}/team`}
            className="text-xs font-bold text-muted-ink hover:text-ink hover:underline flex items-center gap-1"
          >
            Team & Shares
          </Link>
          <Link
            href={href}
            className={cn(btn.secondary, "h-8 px-3 text-xs font-bold gap-1")}
          >
            <span>Open project</span>
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MyProjectsView() {
  const { ready, signedIn } = useSession();
  const myProjects = useApi<MyProjectsOut>(signedIn ? "/me/projects" : null);
  const [tab, setTab] = useState<ProjectTab>("all");

  if (ready && !signedIn) {
    return (
      <EmptyState
        title="Sign in to view your projects"
        body="Access the projects you have created and teams you contribute to."
        action={
          <Link href="/" className={btn.primary}>
            Sign in
          </Link>
        }
        className="py-24"
      />
    );
  }

  const data = myProjects.data;
  const owned = data?.owned ?? [];
  const contributing = data?.contributing ?? [];
  const all = data?.all ?? [];
  const memberships = data?.memberships ?? {};

  const items = tab === "owned" ? owned : tab === "contributing" ? contributing : all;

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-8 lg:px-8">
      {/* Header banner */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-ink">My Projects</h1>
            <span className="rounded-full bg-teal-tint px-2.5 py-0.5 text-xs font-bold text-teal border border-teal/20">
              {all.length} involved
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-ink">
            Easily manage projects you created and teams where you contribute your skills.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/explore" className={cn(btn.secondary, "h-9.5 text-xs font-bold")}>
            Explore projects
          </Link>
          <Link href="/create" className={cn(btn.primary, "h-9.5 text-xs font-bold gap-1.5")}>
            <Plus className="size-4" strokeWidth={2.5} />
            New project
          </Link>
        </div>
      </header>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-3 mb-6">
        {[
          { id: "all" as const, label: "All Involved", count: all.length },
          { id: "owned" as const, label: "Created by Me", count: owned.length },
          { id: "contributing" as const, label: "Joined Teams", count: contributing.length },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all",
              tab === id
                ? "bg-ink text-white shadow-xs"
                : "bg-sunken text-muted-ink hover:text-ink hover:bg-sunken/80",
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[11px]",
                tab === id ? "bg-white/20 text-white" : "bg-white text-muted-ink border border-line",
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      {myProjects.error ? (
        <ErrorState error={myProjects.error} onRetry={myProjects.reload} />
      ) : !myProjects.data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-line p-4 space-y-3">
              <div className="aspect-[16/9] rounded-xl bg-sunken animate-pulse" />
              <div className="h-5 w-2/3 rounded bg-sunken animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-sunken animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-xs">
          <EmptyState
            title={
              tab === "owned"
                ? "You haven't created any projects yet"
                : tab === "contributing"
                ? "You haven't joined any project teams yet"
                : "No projects found"
            }
            body={
              tab === "owned"
                ? "Share an idea or project to find skilled collaborators and trade skills."
                : tab === "contributing"
                ? "Browse projects looking for help, or accept collaboration invitations in Requests."
                : "Create a project or browse open needs to join a creator team."
            }
            action={
              <div className="flex justify-center gap-2.5">
                <Link href="/create" className={btn.primary}>
                  Create a project
                </Link>
                <Link href="/explore" className={btn.secondary}>
                  Explore open needs
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((project) => {
            const membership = memberships[project.id];
            const isOwner = owned.some((o) => o.id === project.id);
            const skillName = membership?.skill?.name;

            return (
              <MyProjectCard
                key={project.id}
                project={project}
                isOwner={isOwner}
                skillName={skillName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
