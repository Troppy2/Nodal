"use client";

import { Label } from "@/components/Meta";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityDay } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const levels = ["#eef2f4", "#bfe5dd", "#7fcbbd", "#2f9e8c", "#0f766e"];
const WEEKS = 52;

function level(count: number) {
  return count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
}

/** 52 columns of 7 days ending this week; each cell is that day's activity count. */
function grid(days: ActivityDay[]) {
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - end.getUTCDay() - (WEEKS - 1) * 7);
  return Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      return { key, count: day > end ? -1 : (counts.get(key) ?? 0) };
    }),
  );
}

/** GitHub-style heatmap from GET /profiles/{handle}/activity: 52 weeks on desktop, the latest 26 on mobile. */
export function ContributionGraph({ handle }: { handle: string }) {
  const activity = useApi<ActivityDay[]>(`/profiles/${handle}/activity?weeks=${WEEKS}`);
  if (activity.error) return null;
  if (!activity.data) return <Skeleton className="h-24 w-full" />;

  const weeks = grid(activity.data);
  const total = activity.data.reduce((s, d) => s + d.count, 0);
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <Label>{total === 0 ? "No activity this year yet" : `${total} ${total === 1 ? "contribution" : "contributions"} this year`}</Label>
        <div className="flex items-center gap-1 text-xs text-muted-ink" aria-hidden>
          Less
          {levels.map((c) => (
            <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          More
        </div>
      </div>
      <div role="img" aria-label={`${total} contributions in the last year`} className="flex justify-between gap-[3px]">
        {weeks.map((week, w) => (
          <div key={w} className={cn("flex flex-1 flex-col gap-[3px]", w < WEEKS - 26 && "max-lg:hidden")}>
            {week.map((cell) => (
              <span
                key={cell.key}
                title={cell.count >= 0 ? `${cell.count} on ${cell.key}` : undefined}
                className="aspect-square w-full rounded-[2px]"
                style={{ background: cell.count < 0 ? "transparent" : levels[level(cell.count)] }}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
