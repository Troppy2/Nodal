"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { projects, type Project, viewerFits } from "@/lib/catalog";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { ProjectGrid } from "./ProjectTile";

const filters: { id: string; label: string; test: (p: Project) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "you", label: "Needs you", test: (p) => p.needs.some((n) => viewerFits(p, n)) },
  { id: "ideas", label: "Ideas", test: (p) => p.stage === "idea" },
  { id: "software", label: "Software", test: (p) => p.disciplines.includes("software") },
  { id: "hardware", label: "Hardware", test: (p) => p.disciplines.includes("hardware") },
  { id: "creative", label: "Creative", test: (p) => p.disciplines.includes("creative") },
  { id: "open", label: "Open source", test: (p) => p.source === "open" },
];

function matches(p: Project, q: string) {
  const hay = [p.title, p.summary, p.owner.handle, p.owner.name, ...p.tags, ...p.needs.map((n) => n.skill)].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function ExploreGrid() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState("all");
  const query = q.trim().toLowerCase();
  const test = filters.find((f) => f.id === filter)!.test;
  const shown = projects.filter((p) => test(p) && (!query || matches(p, query)));
  const filtered = filter !== "all" || query !== "";

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block lg:max-w-[520px]">
        <span className="sr-only">Search projects, people, skills</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-ink" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects, people, skills"
          className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-10 text-[15px] outline-none placeholder:text-muted-ink focus:border-ink [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-ink hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filters">
        {filters.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              aria-pressed={on}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-9 shrink-0 rounded-md border px-3 text-[13px] font-medium transition-colors",
                on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink",
                f.id === "you" && !on && "text-teal",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-ink" aria-live="polite">
        {shown.length} {shown.length === 1 ? "project" : "projects"}
        {query && <> matching “{q.trim()}”</>}
      </p>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-semibold">No projects match</p>
          <p className="max-w-xs text-sm text-muted-ink">Try a skill like “PCB design” or clear the filters.</p>
          {filtered && (
            <button
              className={btn.secondary}
              onClick={() => {
                setQ("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ProjectGrid projects={shown} />
      )}
    </div>
  );
}
