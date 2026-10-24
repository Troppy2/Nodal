"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/Meta";
import { api } from "@/lib/api";
import type { MeOut, Offer, Skill } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/** What a person offers, with levels. The owner edits inline and saves with PUT /me/offers. */
export function OfferEditor({ offers, editable, onSaved }: { offers: Offer[]; editable: boolean; onSaved?: (me: MeOut) => void }) {
  const [draft, setDraft] = useState(offers);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState("");
  const [saving, setSaving] = useState(false);
  const skills = useApi<Skill[]>(editing ? "/skills" : null);
  const options = (skills.data ?? []).filter((s) => !draft.some((o) => o.skill.id === s.id));
  const list = editing ? draft : offers;

  async function save() {
    setSaving(true);
    try {
      const me = await api<MeOut>("/me/offers", {
        method: "PUT",
        body: draft.map((o) => ({ skill_id: o.skill.id, level: o.level })),
      });
      onSaved?.(me);
      invalidate("/feed", "/me", "/projects");
      setEditing(false);
      toast.success("Offers saved", { description: "Matches update with your new skills." });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <Label>Offers</Label>
        {editable && !editing && (
          <button
            className="rounded px-1 text-[13px] font-semibold hover:underline"
            onClick={() => {
              setDraft(offers);
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
            <li key={o.skill.id} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{o.skill.name}</span>
              <div role="radiogroup" aria-label={`${o.skill.name} level`} className="flex rounded-md border border-line p-0.5">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    role="radio"
                    aria-checked={o.level === lvl}
                    onClick={() => setDraft((d) => d.map((x) => (x.skill.id === o.skill.id ? { ...x, level: lvl } : x)))}
                    className={cn(
                      "h-8 w-9 rounded text-xs font-semibold transition-colors",
                      o.level === lvl ? "bg-ink text-white" : "text-muted-ink hover:bg-sunken hover:text-ink",
                    )}
                  >
                    L{lvl}
                  </button>
                ))}
              </div>
              <button
                aria-label={`Remove ${o.skill.name}`}
                onClick={() => setDraft((d) => d.filter((x) => x.skill.id !== o.skill.id))}
                className="flex size-9 items-center justify-center rounded-md text-muted-ink hover:bg-sunken hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ) : (
            <li key={o.skill.id} className="flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[13px] font-medium">
              {o.skill.name}
              <span className="text-[11px] text-muted-ink">L{o.level}</span>
            </li>
          ),
        )}
        {!editing && list.length === 0 && (
          <li className="text-sm text-muted-ink">{editable ? "Add the skills you offer so matching can find you." : "No skills listed yet."}</li>
        )}
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
              disabled={!skills.data}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-sm outline-none hover:border-ink/30 focus:border-ink"
            >
              <option value="">{skills.data ? "Add a skill" : "Loading skills"}</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              className={btn.secondary}
              disabled={!adding}
              onClick={() => {
                const skill = options.find((s) => String(s.id) === adding);
                if (skill) setDraft((d) => [...d, { skill, level: 2 }]);
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
            <button className={btn.primary} onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save offers
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
