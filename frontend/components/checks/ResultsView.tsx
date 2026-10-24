"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { CollabButton } from "@/components/CollabDialog";
import { CoverArt } from "@/components/feed/CoverArt";
import { Label, ProjectMeta } from "@/components/Meta";
import { buildGraph } from "@/components/people/graph-data";
import { GraphLegend, PeopleGraph } from "@/components/people/PeopleGraph";
import { PersonDetail } from "@/components/people/PersonDetail";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { me, type Project } from "@/lib/catalog";
import { coolFactor, coolSteps, marketRun, marketSteps } from "@/lib/seed-results";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { CoolFactorCard } from "./CoolFactorCard";
import { ResearchReport } from "./ResearchReport";

type CheckId = "market" | "cool";
type MobileTab = "people" | CheckId;

interface Run {
  status: "idle" | "running" | "done";
  steps: string[];
}

// The seeded idea already has both checks; anything else starts empty and runs in fixture mode.
const SEEDED = "soil-choir";
const STEP_MS = 450;

/** Simulates POST /projects/{id}/research in fixture mode: steps stream in, then the stored report shows. */
function useCheckRuns(seeded: boolean, title: string) {
  const done: Run = { status: "done", steps: [] };
  const idle: Run = { status: "idle", steps: [] };
  const [runs, setRuns] = useState<Record<CheckId, Run>>({ market: seeded ? done : idle, cool: seeded ? done : idle });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function start(check: CheckId) {
    const labels = check === "market" ? marketSteps(title) : coolSteps;
    setRuns((r) => ({ ...r, [check]: { status: "running", steps: [] } }));
    labels.forEach((label, i) => {
      timers.current.push(
        setTimeout(() => setRuns((r) => ({ ...r, [check]: { status: "running", steps: [...r[check].steps, label] } })), i * STEP_MS),
      );
    });
    timers.current.push(
      setTimeout(() => setRuns((r) => ({ ...r, [check]: { status: "done", steps: r[check].steps } })), labels.length * STEP_MS + 300),
    );
  }

  return { runs, start };
}

function RunSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-2 py-2" aria-live="polite">
      {[...steps].reverse().map((s, i) => (
        <li key={s} className={cn("flex items-center gap-2 text-sm", i === 0 ? "text-ink" : "text-muted-ink")}>
          {i === 0 ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-teal" />}
          {s}
        </li>
      ))}
    </ol>
  );
}

function CheckBody({ check, run, onRun, sample, own }: { check: CheckId; run: Run; onRun: () => void; sample: boolean; own: boolean }) {
  if (run.status === "running") return <RunSteps steps={run.steps} />;
  if (run.status === "idle" && !own) {
    return <p className="py-2 text-sm text-muted-ink">The owner hasn&apos;t shared a {check === "market" ? "market report" : "cool factor score"} yet.</p>;
  }
  if (run.status === "idle") {
    return (
      <div className="flex flex-col items-start gap-3 py-2">
        <p className="text-sm leading-relaxed text-ink/80">
          {check === "market"
            ? "Searches the web for competitors and demand, then gives a cited verdict on whether this could be a company."
            : "Scores novelty, demo appeal, fun to build with others, and weekend-sized scope. Ignores money."}
        </p>
        <button onClick={onRun} className={btn.primary}>
          {check === "market" ? "Run market check" : "Score cool factor"}
        </button>
      </div>
    );
  }
  return check === "market" ? (
    <ResearchReport report={marketRun.report} sources={marketRun.sources} facts={marketRun.facts} isSample={sample || marketRun.is_sample} />
  ) : (
    <CoolFactorCard cool={coolFactor} isSample={sample} />
  );
}

/** Checks and people: the People graph beside the chosen checks. Mobile splits them into tabs. */
export function ResultsView({ project }: { project: Project }) {
  const seeded = project.id === SEEDED;
  const own = project.owner.handle === me.handle;
  // Market and cool-factor checks exist for ideas only. Projects keep the people side.
  const isIdea = project.stage === "idea";
  const { nodes, rings } = buildGraph(project);
  const [check, setCheck] = useState<CheckId>("market");
  const [mobileTab, setMobileTab] = useState<MobileTab>("people");
  const [selected, setSelected] = useState(nodes[0]?.person.handle ?? "");
  const { runs, start } = useCheckRuns(seeded, project.title);
  const node = nodes.find((n) => n.person.handle === selected) ?? nodes[0];

  const finished = (["market", "cool"] as const).filter((c) => runs[c].status === "done").length;
  const status = !isIdea
    ? `${nodes.length} ${nodes.length === 1 ? "person fits" : "people fit"}`
    : finished === 2
      ? "Both checks finished"
      : finished === 1
        ? "One check finished"
        : "No checks run yet";
  const shownTab: MobileTab = isIdea ? mobileTab : "people";

  const primary = own ? (
    <Link href={`/projects/${project.id}/team`} className={btn.primary}>
      Start building
    </Link>
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
          <CoverArt cover={project.cover} seed={project.id} className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{project.title}</h1>
            <ProjectMeta project={project} className="mt-1" />
          </div>
          <Label className="mr-2">{status}</Label>
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
            <div className="flex items-baseline justify-between">
              <h2 id="people-title" className="text-[15px] font-bold">
                People who fit
              </h2>
              <Label>
                {nodes.length} {nodes.length === 1 ? "person" : "people"} · {project.needs.length} open{" "}
                {project.needs.length === 1 ? "need" : "needs"}
              </Label>
            </div>
            {nodes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-ink">
                {project.needs.length === 0 ? "This project has no open needs." : "Nobody offers these skills yet. New people join every day."}
              </p>
            ) : (
              <>
                <div className="mt-4">
                  <PeopleGraph center={project.title} nodes={nodes} rings={rings} selected={node.person.handle} onSelect={setSelected} />
                </div>
                <div className="mt-3">
                  <GraphLegend cycles={nodes.some((n) => n.kind)} />
                </div>
                <div className="mt-5 border-t border-line pt-5">
                  <PersonDetail node={node} canInvite={own} />
                </div>
              </>
            )}
          </section>

          {isIdea && (
            <section
              aria-label="Checks"
              className={cn("px-4 py-5 lg:block lg:overflow-hidden lg:rounded-xl lg:border lg:border-line lg:p-0", shownTab === "people" && "hidden")}
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
                <div
                  key={c}
                  className={cn("lg:p-5", shownTab === c ? "block" : "hidden", check === c ? "lg:block" : "lg:hidden")}
                >
                  <CheckBody check={c} run={runs[c]} onRun={() => start(c)} sample={!seeded} own={own} />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
