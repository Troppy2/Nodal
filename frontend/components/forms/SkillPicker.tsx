"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { allSkills } from "@/lib/skills";
import { cn } from "@/lib/utils";

/** Chips for needed skills, with remove buttons and a searchable "Add skill" list. */
export function SkillPicker({
  value,
  onChange,
  invalid,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const query = text.trim().toLowerCase();
  const options = allSkills.filter((s) => !value.includes(s) && s.toLowerCase().includes(query));
  const custom = text.trim() && !allSkills.some((s) => s.toLowerCase() === query) && !value.includes(text.trim());

  function add(skill: string) {
    const s = skill.trim();
    if (s && !value.includes(s)) onChange([...value, s]);
    setText("");
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {value.map((s) => (
          <li key={s} className="flex h-9 items-center gap-0.5 rounded-md border border-line pl-2.5 pr-0.5 text-[13px] font-medium">
            {s}
            <button
              type="button"
              aria-label={`Remove ${s}`}
              onClick={() => onChange(value.filter((v) => v !== s))}
              className="flex size-8 items-center justify-center rounded text-muted-ink hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex h-9 items-center gap-1 rounded-md border border-dashed px-2.5 text-[13px] font-medium transition-colors",
              open ? "border-ink text-ink" : invalid ? "border-cool text-cool" : "border-muted-ink/50 text-muted-ink hover:text-ink",
            )}
          >
            <Plus className="size-3.5" /> Add skill
          </button>
        </li>
      </ul>

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
                else if (custom) add(text);
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search skills"
            aria-label="Search skills"
            className="h-10 w-full rounded-t-lg border-b border-line px-3 text-sm outline-none"
          />
          <ul className="max-h-48 overflow-y-auto p-1">
            {options.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => add(s)}
                  className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-sm hover:bg-sunken"
                >
                  {s}
                </button>
              </li>
            ))}
            {custom && (
              <li>
                <button
                  type="button"
                  onClick={() => add(text)}
                  className="flex h-9 w-full items-center gap-1 rounded-md px-2.5 text-left text-sm hover:bg-sunken"
                >
                  Add “{text.trim()}”
                </button>
              </li>
            )}
            {options.length === 0 && !custom && <li className="px-2.5 py-2 text-sm text-muted-ink">All matching skills added.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
