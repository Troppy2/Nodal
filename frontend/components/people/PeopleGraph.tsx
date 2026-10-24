"use client";

import { Avatar } from "@/components/Avatar";
import { firstName } from "@/components/checks/States";
import { DisciplineMark } from "@/components/Meta";
import { cn } from "@/lib/utils";
import type { PersonNode } from "./graph-data";

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
  viewerId,
  onSelect,
}: {
  center: string;
  nodes: PersonNode[];
  rings: { from: string; to: string }[];
  selected: string;
  viewerId: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = Object.fromEntries(nodes.map((n) => [n.profile.id, n]));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] sm:aspect-[16/10] sm:max-w-[620px]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {nodes.map((n) => (
          <line
            key={n.profile.id}
            x1="50"
            y1="48"
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
            x1={byId[r.from].x}
            y1={byId[r.from].y}
            x2={byId[r.to].x}
            y2={byId[r.to].y}
            stroke={TEAL}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div
        className="absolute flex size-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink p-3 text-center text-[13px] font-extrabold leading-tight text-white"
        style={{ left: "50%", top: "48%" }}
      >
        <span className="line-clamp-3">{center}</span>
      </div>

      {nodes.map((n) => {
        const active = selected === n.profile.id;
        const name = n.profile.id === viewerId ? "You" : firstName(n.profile);
        return (
          <button
            key={n.profile.id}
            onClick={() => onSelect(n.profile.id)}
            aria-pressed={active}
            aria-label={`${n.profile.display_name ?? n.profile.handle}, fills ${n.skills.join(", ")}${n.kind ? `, ${n.kind}` : ""}`}
            className="group absolute flex -translate-x-1/2 -translate-y-[30%] cursor-pointer flex-col items-center gap-1 rounded-xl p-1"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span
              className={cn(
                "rounded-full p-[3px] transition-shadow",
                active ? "ring-2 ring-ink" : "ring-2 ring-transparent group-hover:ring-line",
              )}
            >
              <span className={cn("block rounded-full border-2", n.kind ? "border-teal" : "border-transparent")}>
                <Avatar person={n.profile} size={44} />
              </span>
            </span>
            <span className="flex flex-col items-center bg-white/90 px-1 leading-tight">
              <span className={cn("text-xs", active ? "font-bold" : "font-semibold")}>{name}</span>
              <span className="max-w-[140px] truncate text-xs text-muted-ink">
                {n.skills[0]}
                {n.skills.length > 1 && ` +${n.skills.length - 1}`}
              </span>
              {n.kind && <span className="text-xs font-medium text-teal">{n.kind === "swap" ? "Swap" : "Ring"}</span>}
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
        <span key={t} className="flex items-center gap-1.5 capitalize">
          <DisciplineMark type={t} /> {t}
        </span>
      ))}
      {cycles && (
        <span className="flex items-center gap-1.5 text-teal">
          <span className="inline-block h-0.5 w-4 bg-teal" /> Swap or ring
        </span>
      )}
    </p>
  );
}
