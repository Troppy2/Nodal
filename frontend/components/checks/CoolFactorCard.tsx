import { Label } from "@/components/Meta";
import type { ResearchOut } from "@/lib/api-types";

const measureLabel: Record<string, string> = {
  novelty: "Novelty",
  demo_appeal: "Demo appeal",
  fun_to_build: "Fun to build with others",
  scope: "Weekend-sized scope",
};

/** Cool factor: an AI opinion on how fun the idea is to watch and build. It ignores money. */
export function CoolFactorCard({ run }: { run: ResearchOut }) {
  const cool = run.cool!;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>AI score. Ignores money and market size.</Label>
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-cool">{cool.overall.toFixed(1)}</span>
            <span className="text-sm text-muted-ink">/10</span>
          </p>
        </div>
        {run.is_sample && <Label className="shrink-0 rounded-md border border-line px-2 py-1">Sample (demo data)</Label>}
      </div>
      <p className="mt-2 text-[15px] leading-relaxed">{cool.why}</p>
      <ul className="mt-5 flex flex-col gap-4">
        {cool.measures.map((m) => {
          const label = measureLabel[m.key] ?? m.key;
          return (
            <li key={m.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">{label}</span>
                <span className="text-xs tabular-nums">{m.score}/10</span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"
                role="meter"
                aria-label={label}
                aria-valuemin={1}
                aria-valuemax={10}
                aria-valuenow={m.score}
              >
                <div className="h-full rounded-full bg-cool" style={{ width: `${m.score * 10}%` }} />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">{m.reason}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
