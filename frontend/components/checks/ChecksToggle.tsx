"use client";

import { cn } from "@/lib/utils";

function Toggle({
  label,
  checked,
  onChange,
  tone,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone: "teal" | "cool";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? (tone === "teal" ? "bg-teal" : "bg-cool") : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-[3px] size-[18px] rounded-full bg-white transition-transform",
            checked ? "translate-x-[23px]" : "translate-x-[3px]",
          )}
        />
      </span>
    </button>
  );
}

export interface Checks {
  market: boolean;
  cool: boolean;
}

const rows = [
  {
    key: "market" as const,
    title: "Market check",
    body: "Searches the web for competitors and demand, then says if it could be a company.",
    tone: "teal" as const,
  },
  {
    key: "cool" as const,
    title: "Cool factor",
    body: "Scores novelty, demo appeal, and how fun it is to build with others. Ignores money.",
    tone: "cool" as const,
  },
];

/** "What should Nodal check?" with the Market check and Cool factor switches. */
export function ChecksToggle({ value, onChange }: { value: Checks; onChange: (v: Checks) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">What should Nodal check?</legend>
      <p className="mb-2 text-[13px] text-muted-ink">Either, both, or neither. You can run them later.</p>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="text-[13px] leading-snug text-muted-ink">{r.body}</p>
            </div>
            <Toggle label={r.title} tone={r.tone} checked={value[r.key]} onChange={(v) => onChange({ ...value, [r.key]: v })} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function submitLabel({ market, cool }: Checks) {
  if (market && cool) return "Post and run both checks";
  if (market) return "Post and run market check";
  if (cool) return "Post and score cool factor";
  return "Post";
}
