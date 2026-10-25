"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Quote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResearchOut } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Typewriter } from "./Typewriter";

function elapsedLabel(start: string, tick: number) {
  const started = Date.parse(start);
  if (Number.isNaN(started)) return "";
  const seconds = Math.max(0, Math.floor((tick - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function phaseOf(run: ResearchOut, check: "market" | "cool") {
  // Both checks share one event log, so pick out the steps that belong to this check. Findings
  // arrive between phases and say nothing about what the run is doing.
  const labels = run.steps
    .filter((s) => s.kind !== "fact")
    .map((s) => s.label)
    .filter((l) => (check === "cool" ? l.startsWith("Looking around") || l.startsWith("Scoring") : !l.startsWith("Looking around") && !l.startsWith("Scoring")));
  const last = labels[labels.length - 1] ?? "";
  if (last.startsWith("Writing report")) return "Writing the report";
  if (last.startsWith("Found ") || last.startsWith("Extracting")) return "Reading sources";
  if (last.startsWith("Reading")) return "Reading sources";
  if (last.startsWith("Searching")) return "Searching the web";
  if (last.startsWith("Planning")) return "Planning searches";
  if (last.startsWith("Looking around")) return "Looking at similar projects";
  if (last.startsWith("Scoring")) return "Scoring";
  return check === "market" ? "Starting the market check" : "Starting cool factor";
}

export function CheckSkeleton({ check }: { check: "market" | "cool" }) {
  return (
    <div className="py-1" aria-busy="true" aria-label="Loading check">
      <Skeleton className="h-3 w-32 rounded" />
      {check === "market" ? (
        <>
          <Skeleton className="mt-2 h-7 w-40 rounded-md" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-[92%] rounded" />
            <Skeleton className="h-3.5 w-3/4 rounded" />
          </div>
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3.5 w-full rounded" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <Skeleton className="mt-2 h-9 w-24 rounded-md" />
          <div className="mt-4 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The run is still going: show real pipeline events as they land. Findings are written into the run
 * row by the backend as each page is read, so this is not a fake progress animation. Only the newest
 * line types; older lines render at once.
 */
export function LiveRun({ run, check }: { run: ResearchOut; check: "market" | "cool" }) {
  const [tick, setTick] = useState(() => Date.now());
  const list = useRef<HTMLOListElement>(null);
  // Both checks log into the same run, so this panel only shows its own events.
  const steps = check === "cool"
    ? run.steps.filter((s) => s.label.startsWith("Looking around") || s.label.startsWith("Scoring"))
    : run.steps.filter((s) => !s.label.startsWith("Looking around") && !s.label.startsWith("Scoring"));
  const facts = steps.filter((s) => s.kind === "fact").length;
  // A run can log 30+ events; keep the newest ones and say how many scrolled off.
  const tail = steps.slice(-12);
  const hidden = steps.length - tail.length;

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Keep the newest line in view while it types: text wraps as characters arrive, so the scroll
    // height grows between renders. Stops as soon as the person scrolls up to read an earlier finding.
    const pin = () => {
      const el = list.current;
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 56) el.scrollTop = el.scrollHeight;
    };
    pin();
    const timer = setInterval(pin, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="py-1">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-teal">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-teal" />
          {phaseOf(run, check)}
        </p>
        <p className="flex items-center gap-3 text-[13px] tabular-nums text-muted-ink">
          {facts > 0 && <span>{facts} {facts === 1 ? "finding" : "findings"}</span>}
          <span>{elapsedLabel(run.created_at, tick)}</span>
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-sunken/40 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-ink">
          {check === "market" ? "What it is finding" : "Progress"}
        </p>
        {steps.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-ink">
            <Loader2 className="size-3.5 animate-spin" /> Starting
          </p>
        ) : (
          <>
            {hidden > 0 && (
              <p className="mt-1.5 text-[12px] text-muted-ink">
                {hidden} earlier {hidden === 1 ? "event" : "events"}
              </p>
            )}
            <ol ref={list} className="mt-2 flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1 sm:max-h-[228px]">
              {tail.map((s, j) => {
                const isFact = s.kind === "fact";
                const isLatest = j === tail.length - 1;
                return (
                  <li key={`${s.at}-${j}`} className={cn("flex gap-2 text-[13px] leading-relaxed", isFact ? "text-ink" : "text-muted-ink")}>
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center" aria-hidden>
                      {isFact ? (
                        <Quote className="size-3 text-teal" />
                      ) : isLatest ? (
                        <Loader2 className="size-3.5 animate-spin text-ink" />
                      ) : (
                        <Check className="size-3.5 text-teal" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <Typewriter text={s.label} instant={!isLatest} speed={isFact ? 7 : 4} />
                      {isFact && s.source && <span className="ml-1 text-muted-ink">· {s.source}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <p role="status" className="sr-only">
        {phaseOf(run, check)}. {facts} findings so far.
      </p>

      <div className="mt-4 space-y-2.5" aria-hidden>
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-[88%] rounded" />
        <Skeleton className="h-3.5 w-2/3 rounded" />
      </div>

      <p className="mt-3 text-[13px] text-muted-ink">
        {check === "market"
          ? "Hunting down sources and writing a cited report. Usually under a minute."
          : "Scoring the idea. A few seconds."}
      </p>
    </div>
  );
}
