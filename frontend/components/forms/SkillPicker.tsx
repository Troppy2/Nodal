"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DisciplineMark } from "@/components/Meta";
import type { Skill } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/** Searchable list of skills from the taxonomy (GET /skills). Picking one calls `onAdd`. */
export function SkillPicker({ exclude, onAdd, invalid }: { exclude: number[]; onAdd: (skill: Skill) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const skills = useApi<Skill[]>(open ? "/skills" : null);
  const query = text.trim().toLowerCase();
  const options = (skills.data ?? []).filter((s) => !exclude.includes(s.id) && s.name.toLowerCase().includes(query));

  function add(skill: Skill) {
    onAdd(skill);
    setText("");
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-1 rounded-md border border-dashed px-2.5 text-[13px] font-medium transition-colors",
          open ? "border-ink text-ink" : invalid ? "border-cool text-cool" : "border-muted-ink/50 text-muted-ink hover:border-ink hover:text-ink",
        )}
      >
        <Plus className="size-3.5" /> Add skill
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-line">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (options[0]) add(options[0]);
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search skills"
            aria-label="Search skills"
            className="h-10 w-full rounded-t-lg border-b border-line px-3 text-sm outline-none focus-visible:border-ink"
          />
          <ul className="max-h-56 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {skills.error ? (
              <li className="px-2.5 py-2 text-sm text-muted-ink">
                Couldn&apos;t load skills.{" "}
                <button type="button" className="font-semibold text-ink hover:underline" onClick={skills.reload}>
                  Retry
                </button>
              </li>
            ) : !skills.data ? (
              <li className="px-2.5 py-2 text-sm text-muted-ink">Loading skills</li>
            ) : options.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-muted-ink">No skill matches “{text.trim()}”.</li>
            ) : (
              options.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => add(s)}
                    className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-sunken"
                  >
                    <DisciplineMark type={s.category} />
                    {s.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
