import { Label } from "@/components/Meta";
import { cn } from "@/lib/utils";

const levels = ["#eef2f4", "#bfe5dd", "#7fcbbd", "#2f9e8c", "#0f766e"];

/** Deterministic activity levels (0-4) per day, seeded by handle until /profiles/{handle}/activity is wired. */
function activity(handle: string, weeks: number) {
  let s = [...handle].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 233280;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, () => {
      // Busier toward recent weeks.
      const r = rand() * (0.7 + (w / weeks) * 0.5);
      return r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.78 ? 2 : r < 0.9 ? 3 : 4;
    }),
  );
}

/** GitHub-style heatmap: 52 weeks on desktop, the latest 26 on mobile. */
export function ContributionGraph({ handle }: { handle: string }) {
  const weeks = activity(handle, 52);
  const total = weeks.flat().reduce<number>((a, b) => a + b, 0);
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <Label>{total} contributions this year</Label>
        <div className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted-ink" aria-hidden>
          Less
          {levels.map((c) => (
            <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          More
        </div>
      </div>
      <div role="img" aria-label={`${total} contributions in the last year`} className="flex justify-between gap-[3px]">
        {weeks.map((week, w) => (
          <div key={w} className={cn("flex flex-1 flex-col gap-[3px]", w < 26 && "max-lg:hidden")}>
            {week.map((lvl, d) => (
              <span key={d} className="aspect-square w-full rounded-[2px]" style={{ background: levels[lvl] }} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
