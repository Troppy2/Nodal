"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CollabButton } from "@/components/CollabDialog";
import { CoverArt } from "@/components/feed/CoverArt";
import { Label, ProjectMeta } from "@/components/Meta";
import { layoutPeople } from "@/components/people/graph-data";
import { GraphLegend, PeopleGraph } from "@/components/people/PeopleGraph";
import { PersonDetail } from "@/components/people/PersonDetail";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { GraphOut, MatchOut, ProjectDetail } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { CoolFactorCard } from "./CoolFactorCard";
import { CheckSkeleton, LiveRun } from "./LiveRun";
import { ResearchReport } from "./ResearchReport";
import { EmptyState, ErrorState } from "./States";
import { type CheckId, useResearch } from "./use-research";

type MobileTab = "people" | CheckId;

const blurb: Record<CheckId, string> = {
  market: "Searches the web for competitors and demand, then gives a cited verdict on whether this could be a company.",
  cool: "Scores novelty, demo appeal, fun to build with others, and weekend-sized scope. Ignores money.",
};

function CheckBody({
  check,
  research,
  own,
  typeIn,
}: {
  check: CheckId;
  research: ReturnType<typeof useResearch>;
  own: boolean;
  typeIn: boolean;
}) {
  const { run, loading, error, starting, start, reload } = research;
  if (loading) return <CheckSkeleton check={check} />;
  if (error) return <ErrorState error={error} onRetry={reload} className="py-6" />;
  const covers = run?.checks.includes(check);
  // One check can finish while the other is still running; show the finished one immediately.
  if (run && check === "market" && run.report) return <ResearchReport run={run} typeIn={typeIn} />;
  if (run && check === "cool" && run.cool) return <CoolFactorCard run={run} typeIn={typeIn} />;
  if (run && covers && (run.status === "queued" || run.status === "running")) return <LiveRun run={run} check={check} />;
  if (run && covers && run.status === "failed") {
    return (
      <EmptyState
        title="The check didn't finish"
        body={run.error ?? "Something went wrong while it ran."}
        action={
          own && (
            <button onClick={() => start(check)} disabled={starting} className={btn.primary}>
              Try again
            </button>
          )
        }
        className="py-6"
      />
    );
  }
  if (!own) {
    return (
      <p className="py-2 text-sm text-muted-ink">
        The owner hasn&apos;t shared a {check === "market" ? "market report" : "cool factor score"} yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 py-2">
      <p className="text-sm leading-relaxed text-ink/80">{blurb[check]}</p>
      <button onClick={() => start(check)} disabled={starting} className={btn.primary}>
        {starting && <Loader2 className="size-4 animate-spin" />}
        {check === "market" ? "Run market check" : "Score cool factor"}
      </button>
    </div>
  );
}

function PeoplePanel({ project, viewerId, own }: { project: ProjectDetail; viewerId: string | null; own: boolean }) {
  const graph = useApi<GraphOut>(`/graph/projects/${project.id}?depth=2`);
  const matches = useApi<MatchOut[]>(`/projects/${project.id}/matches`);
  const [selected, setSelected] = useState("");
  const openNeeds = project.needs.filter((n) => n.status === "open").length;

  if (graph.error || matches.error) {
    return (
      <ErrorState
        error={(graph.error ?? matches.error)!}
        onRetry={() => {
          graph.reload();
          matches.reload();
        }}
      />
    );
  }
  if (!graph.data || !matches.data) return <Skeleton className="mt-4 aspect-[16/10] w-full rounded-lg" />;

  const { nodes, rings } = layoutPeople(graph.data, matches.data);
  if (nodes.length === 0) {
    return (
      <EmptyState
        title={openNeeds === 0 ? "No open needs" : "Nobody offers these skills yet"}
        body={
          openNeeds === 0
            ? "Add a need and Nodal finds the people who can fill it."
            : "New people join every day. Share the project to reach more of them."
        }
        action={
          <Link href={`/projects/${project.id}?tab=needs`} className={btn.secondary}>
            {openNeeds === 0 && own ? "Add a need" : "See the needs"}
          </Link>
        }
      />
    );
  }
  const node = nodes.find((n) => n.profile.id === selected) ?? nodes[0];
  return (
    <>
      <div className="mt-4">
        <PeopleGraph center={project.title} nodes={nodes} rings={rings} selected={node.profile.id} viewerId={viewerId} onSelect={setSelected} />
      </div>
      <div className="mt-3">
        <GraphLegend cycles={nodes.some((n) => n.kind)} />
      </div>
      <div className="mt-5 border-t border-line pt-5">
        <PersonDetail node={node} isOwner={own} viewerId={viewerId} project={project} />
      </div>
    </>
  );
}

/** Checks and people: the People graph beside the idea's checks. Mobile splits them into tabs. */
export function ResultsView({ id }: { id: string }) {
  const { me } = useSession();
  const viewerId = me?.profile.id ?? null;
  const { data: project, error, reload } = useApi<ProjectDetail>(`/projects/${id}`);
  const own = Boolean(project && viewerId && project.owner.id === viewerId);
  // Market and cool-factor checks exist for ideas only. Projects keep the people side.
  const isIdea = project?.stage === "idea";
  const research = useResearch(id, Boolean(isIdea));
  const [check, setCheck] = useState<CheckId>("market");
  const [mobileTab, setMobileTab] = useState<MobileTab>("people");
  // Only type the summary when this visit watched the run happen; a cached report opens instantly.
  const router = useRouter();
  const [watchedRunning, setWatchedRunning] = useState(false);
  const [startingBuild, setStartingBuild] = useState(false);
  const runStatus = research.run?.status;

  async function startBuilding() {
    if (!project) return;
    setStartingBuild(true);
    try {
      await api(`/projects/${project.id}`, { method: "PATCH", body: { stage: "building" } });
      toast.success("Project is now building! Code tab and team workspace unlocked.");
      invalidate("/feed", "/projects", `/projects/${project.id}`);
      router.push(`/projects/${project.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStartingBuild(false);
    }
  }
  useEffect(() => {
    if (runStatus === "queued" || runStatus === "running") setWatchedRunning(true);
  }, [runStatus]);

  if (error) {
    return error instanceof ApiError && error.status === 404 ? (
      <EmptyState
        title="Project not found"
        body="It may have been deleted, or the link is wrong."
        action={
          <Link href="/explore" className={btn.secondary}>
            Explore projects
          </Link>
        }
        className="py-24"
      />
    ) : (
      <ErrorState error={error} onRetry={reload} className="py-24" />
    );
  }
  if (!project) {
    return (
      <div className="mx-auto max-w-[1120px] px-4 py-7 lg:px-8" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-14 w-72 rounded-lg" />
        <Skeleton className="mt-6 h-96 rounded-xl" />
      </div>
    );
  }

  const run = research.run;
  const done = (["market", "cool"] as const).filter((c) => (c === "market" ? run?.report : run?.cool)).length;
  const running = Boolean(run && (run.status === "queued" || run.status === "running"));
  const fit = project.people_fit;
  const status = !isIdea
    ? `${fit} ${fit === 1 ? "person fits" : "people fit"}`
    : running
      ? run!.checks.length > 1
        ? "Both checks running"
        : run!.checks[0] === "market"
          ? "Market check running"
          : "Cool factor running"
      : done === 2
        ? "Both checks finished"
        : done === 1
          ? "One check finished"
          : "No checks run yet";
  const shownTab: MobileTab = isIdea ? mobileTab : "people";
  const openNeeds = project.needs.filter((n) => n.status === "open").length;

  const primary = own ? (
    isIdea ? (
      <button onClick={startBuilding} disabled={startingBuild} className={btn.primary}>
        {startingBuild && <Loader2 className="size-4 animate-spin" />}
        Start building
      </button>
    ) : (
      <Link href={`/projects/${project.id}/team`} className={btn.primary}>
        Team
      </Link>
    )
  ) : (
    <CollabButton project={project} />
  );

  return (
    <>
      <MobileHeader title={project.title} subtitle={status} back={`/projects/${project.id}`} action={primary} />
      {isIdea && (
        <TabStrip<MobileTab>
          fill
          value={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: "people", label: "People" },
            { id: "market", label: "Market" },
            { id: "cool", label: "Cool factor" },
          ]}
          className="lg:hidden"
        />
      )}

      <div className="mx-auto max-w-[1120px] lg:px-8 lg:py-7">
        <header className="hidden items-center gap-4 lg:flex">
          <CoverArt cover={project.cover} seed={project.id} coverUrl={project.cover_url} className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{project.title}</h1>
            <ProjectMeta project={project} className="mt-1" />
          </div>
          <p className="mr-2 text-[13px] text-muted-ink">{status}</p>
          <Link href={`/projects/${project.id}`} className={btn.secondary}>
            View post
          </Link>
          {primary}
        </header>

        <div className={cn("lg:mt-6", isIdea ? "lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6" : "lg:max-w-[760px]")}>
          <section
            aria-labelledby="people-title"
            className={cn("px-4 py-5 lg:block lg:rounded-xl lg:border lg:border-line lg:p-5", shownTab !== "people" && "hidden")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="people-title" className="text-[15px] font-bold">
                People who fit
              </h2>
              <Label>
                {openNeeds} open {openNeeds === 1 ? "need" : "needs"}
              </Label>
            </div>
            <PeoplePanel project={project} viewerId={viewerId} own={own} />
          </section>

          {isIdea && (
            <section
              aria-label="Checks"
              className={cn(
                "focus-inset px-4 py-5 lg:block lg:overflow-hidden lg:rounded-xl lg:border lg:border-line lg:p-0",
                shownTab === "people" && "hidden",
              )}
            >
              <TabStrip<CheckId>
                fill
                value={check}
                onChange={setCheck}
                tabs={[
                  { id: "market", label: "Market check" },
                  { id: "cool", label: "Cool factor" },
                ]}
                className="hidden lg:flex [&>button]:text-sm"
              />
              {(["market", "cool"] as const).map((c) => (
                <div key={c} className={cn("lg:p-5", shownTab === c ? "block" : "hidden", check === c ? "lg:block" : "lg:hidden")}>
                  <CheckBody check={c} research={research} own={own} typeIn={watchedRunning} />
                </div>
              ))}
              {own && run && (run.report || run.cool) && (
                <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-line py-4 text-sm lg:px-5">
                  <span>
                    <span className="font-semibold">Show on idea page</span>
                    <span className="block text-[13px] text-muted-ink">Anyone who opens the idea can read these checks.</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={run.is_public}
                    onChange={(e) => research.setPublic(e.target.checked)}
                    className="size-5 cursor-pointer accent-teal"
                  />
                </label>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
