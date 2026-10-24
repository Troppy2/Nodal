"use client";

import { tints } from "@/lib/cover";
import { me } from "@/lib/catalog";
import { DisciplineMark } from "@/components/Meta";
import { cn } from "@/lib/utils";
import type { GraphNode } from "./graph-data";

const TEAL = "#0f766e";
const GREY = "#c5ced5";

/**
 * The project in the center, people who fill its needs around it.
 * Edges are SVG; people are real buttons laid over it so they take focus and clicks.
 * Teal edges are swaps and rings; grey edges are plain matches.
 */
export function PeopleGraph({
  center,
  nodes,
  rings,
  selected,
  onSelect,
}: {
  center: string;
  nodes: GraphNode[];
  rings: { from: string; to: string; label: string }[];
  selected: string;
  onSelect: (handle: string) => void;
}) {
  const byHandle = Object.fromEntries(nodes.map((n) => [n.person.handle, n]));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] sm:aspect-[16/10] sm:max-w-[620px]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {nodes.map((n) => (
          <line
            key={n.person.handle}
            x1="50"
            y1="50"
            x2={n.x}
            y2={n.y}
            stroke={n.kind ? TEAL : GREY}
            strokeWidth={n.kind ? 2.5 : 1.25}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {rings.map((r) => (
          <line
            key={`${r.from}-${r.to}`}
            x1={byHandle[r.from].x}
            y1={byHandle[r.from].y}
            x2={byHandle[r.to].x}
            y2={byHandle[r.to].y}
            stroke={TEAL}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>


      <div
        className="absolute flex size-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink p-3 text-center text-[13px] font-extrabold leading-tight text-white"
        style={{ left: "50%", top: "50%" }}
      >
        {center}
      </div>

      {nodes.map((n) => {
        const { fg, bg } = tints[n.person.tint];
        const active = selected === n.person.handle;
        const name = n.person.handle === me.handle ? "You" : n.person.name.split(" ")[0];
        return (
          <button
            key={n.person.handle}
            onClick={() => onSelect(n.person.handle)}
            aria-pressed={active}
            aria-label={`${n.person.name}, fills ${n.skills.join(", ")}${n.kind ? `, ${n.kind}` : ""}`}
            className="group absolute flex -translate-x-1/2 -translate-y-[30%] flex-col items-center gap-1 rounded-xl p-1"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className={cn("rounded-full p-[3px] transition-shadow", active ? "ring-2 ring-ink" : "ring-2 ring-transparent group-hover:ring-line")}>
              <span
                className="flex size-12 items-center justify-center rounded-full border-2 text-sm font-bold"
                style={{ color: fg, background: bg, borderColor: n.kind ? TEAL : fg }}
              >
                {n.person.initials}
              </span>
            </span>
            <span className="flex flex-col items-center bg-white/90 px-1 leading-tight">
              <span className={cn("text-xs", active ? "font-bold" : "font-semibold")}>{name}</span>
              <span className="max-w-[140px] truncate text-xs text-muted-ink">
                {n.skills[0]}
                {n.skills.length > 1 && ` +${n.skills.length - 1}`}
              </span>
              {n.kind && <span className="text-xs font-medium text-teal">{n.kind}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function GraphLegend({ cycles }: { cycles: boolean }) {
  return (
    <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-ink">
      {(["software", "hardware", "creative"] as const).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <DisciplineMark type={t} /> {t}
        </span>
      ))}
      {cycles && (
        <span className="flex items-center gap-1.5 text-teal">
          <span className="inline-block h-0.5 w-4 bg-teal" /> swap or ring
        </span>
      )}
    </p>
  );
}
