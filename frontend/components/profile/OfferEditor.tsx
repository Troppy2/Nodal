"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/Meta";
import { allSkills } from "@/lib/skills";
import type { Offer } from "@/lib/catalog";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** What a person offers, with levels. The owner can edit inline (PUT /me/offers once wired). */
export function OfferEditor({ initial, editable }: { initial: Offer[]; editable: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState("");
  const options = allSkills.filter((s) => !draft.some((o) => o.skill === s));

  const list = editing ? draft : saved;

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <Label>Offers</Label>
        {editable && !editing && (
          <button
            className="text-[13px] font-semibold hover:underline"
            onClick={() => {
              setDraft(saved);
              setEditing(true);
            }}
          >
            Edit
          </button>
        )}
      </div>

      <ul className={cn(editing ? "flex flex-col divide-y divide-line rounded-lg border border-line" : "flex flex-wrap gap-1.5")}>
        {list.map((o) =>
          editing ? (
            <li key={o.skill} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{o.skill}</span>
              <div role="radiogroup" aria-label={`${o.skill} level`} className="flex rounded-md border border-line p-0.5">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    role="radio"
                    aria-checked={o.level === lvl}
                    onClick={() => setDraft((d) => d.map((x) => (x.skill === o.skill ? { ...x, level: lvl } : x)))}
                    className={cn(
                      "h-8 w-9 rounded font-mono text-xs transition-colors",
                      o.level === lvl ? "bg-ink text-white" : "text-muted-ink hover:text-ink",
                    )}
                  >
                    L{lvl}
                  </button>
                ))}
              </div>
              <button
                aria-label={`Remove ${o.skill}`}
                onClick={() => setDraft((d) => d.filter((x) => x.skill !== o.skill))}
                className="flex size-9 items-center justify-center rounded-md text-muted-ink hover:bg-sunken hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ) : (
            <li key={o.skill} className="flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[13px] font-medium">
              {o.skill}
              <span className="font-mono text-[11px] text-muted-ink">L{o.level}</span>
            </li>
          ),
        )}
        {!editing && list.length === 0 && <li className="text-sm text-muted-ink">No skills listed yet.</li>}
      </ul>

      {editing && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="add-offer">
              Add a skill
            </label>
            <select
              id="add-offer"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-sm outline-none focus:border-ink"
            >
              <option value="">Add a skill…</option>
              {options.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              className={btn.secondary}
              disabled={!adding}
              onClick={() => {
                setDraft((d) => [...d, { skill: adding, level: 2 }]);
                setAdding("");
              }}
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button className={btn.ghost} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button
              className={btn.primary}
              onClick={() => {
                setSaved(draft);
                setEditing(false);
                toast.success("Offers saved", { description: "Matches update with your new skills." });
              }}
            >
              Save offers
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
