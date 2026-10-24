"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ChecksToggle, submitLabel, type Checks } from "@/components/checks/ChecksToggle";
import { DisciplineMark, Label } from "@/components/Meta";
import { SignInPrompt } from "@/components/project/states";
import { api } from "@/lib/api";
import type { ProjectDetail, ProjectType, Skill } from "@/lib/api-types";
import { TOLKEN, typeLabel } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { SkillPicker } from "./SkillPicker";

const types: ProjectType[] = ["software", "hardware", "creative"];
const input =
  "w-full rounded-lg border bg-white px-3 text-[15px] text-ink outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink";

interface NeedDraft {
  skill: Skill;
  note: string;
  bounty: string;
}

/** Create screen: one form for ideas and projects. Posts with POST /projects, then runs the chosen checks. */
export function PostForm() {
  const { ready, signedIn, me } = useSession();
  const router = useRouter();
  const [stage, setStage] = useState<"idea" | "building">("idea");
  const [type, setType] = useState<ProjectType | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [readme, setReadme] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [needs, setNeeds] = useState<NeedDraft[]>([]);
  const [checks, setChecks] = useState<Checks>({ market: true, cool: true });
  const [touched, setTouched] = useState(false);
  const [posting, setPosting] = useState(false);

  const balance = me?.tolken_balance ?? 0;
  const bountyTotal = needs.reduce((s, n) => s + (Number(n.bounty) || 0), 0);
  const errors = {
    type: !type ? "Pick what kind of work it is." : null,
    title: !title.trim() ? "Give it a title." : null,
    summary: !summary.trim() ? "Say what it is in a sentence or two." : null,
    needs: needs.length === 0 ? "Add at least one skill you need, so Nodal can match people." : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  // Checks run on ideas only; a project post skips them.
  const activeChecks: Checks = stage === "idea" ? checks : { market: false, cool: false };
  const label = stage === "idea" ? submitLabel(activeChecks) : "Post project";

  function addTag(e: React.SyntheticEvent) {
    e.preventDefault();
    const tag = tagDraft.trim().toLowerCase().replace(/[\s,]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
    if (tag && !tags.includes(tag) && tags.length < 10) setTags([...tags, tag]);
    setTagDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || posting) return;
    setPosting(true);
    try {
      const project = await api<ProjectDetail>("/projects", {
        method: "POST",
        body: {
          title: title.trim(),
          summary: summary.trim(),
          type,
          stage,
          readme_md: readme.trim() || null,
          tags,
          needs: needs.map((n) => ({
            skill_id: n.skill.id,
            note: n.note.trim() || null,
            bounty_tolken: Number(n.bounty) > 0 ? Number(n.bounty) : null,
          })),
        },
      });
      invalidate("/feed", "/projects", "/profiles/", "/me");
      const chosen = (["market", "cool"] as const).filter((c) => activeChecks[c]);
      if (chosen.length > 0) {
        try {
          await api(`/projects/${project.id}/research`, { method: "POST", body: { checks: chosen } });
          toast.success("Posted", { description: "Checks are running. People who fit are below." });
        } catch (err) {
          toast.error("Posted, but the checks didn't start", { description: (err as Error).message });
        }
        router.push(`/projects/${project.id}/results`);
      } else {
        toast.success("Posted");
        router.push(`/projects/${project.id}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
      setPosting(false);
    }
  }

  const err = (msg: string | null) => touched && msg && <p className="mt-1.5 text-[13px] text-cool">{msg}</p>;

  if (ready && !signedIn) {
    return (
      <div className="px-4 py-10 lg:px-0">
        <SignInPrompt>Sign in with your name to post an idea or a project.</SignInPrompt>
      </div>
    );
  }

  const submitButton = (className: string) => (
    <button type="submit" disabled={posting} className={cn(btn.primary, "h-12 w-full text-[15px]", className)}>
      {posting && <Loader2 className="size-4 animate-spin" />}
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} noValidate aria-label="New post">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-2 lg:hidden">
        <Link href="/feed" className="flex h-11 items-center rounded-lg px-2 text-[15px] text-muted-ink hover:text-ink">
          Cancel
        </Link>
        <h1 className="text-base font-bold">New post</h1>
        <button type="submit" disabled={posting} className="flex h-11 items-center rounded-lg px-2 text-[15px] font-bold text-ink">
          Post
        </button>
      </header>

      <h1 className="mb-6 hidden text-[28px] font-extrabold tracking-[-0.02em] lg:block">New post</h1>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        {/* Preview */}
        <aside className="px-4 pt-5 lg:sticky lg:top-8 lg:h-fit lg:px-0 lg:pt-0">
          <Label className="mb-2 max-lg:hidden">Preview</Label>
          <div className="rounded-xl border border-line p-4">
            <p className="truncate text-lg font-extrabold leading-tight tracking-[-0.02em]">{title.trim() || "Untitled"}</p>
            <p className="mt-1 flex items-center gap-3 text-xs text-muted-ink">
              {type && (
                <span className="flex items-center gap-1.5">
                  <DisciplineMark type={type} /> {typeLabel[type]}
                </span>
              )}
              <span className={stage === "idea" ? "text-cool" : undefined}>{stage === "idea" ? "Idea" : "Building"}</span>
            </p>
            {summary.trim() && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/90">{summary.trim()}</p>}
            {needs.length > 0 && (
              <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted-ink">
                Looking for <span className="text-ink">{needs.map((n) => n.skill.name).join(", ")}</span>
              </p>
            )}
          </div>
          <p className="mt-2 text-[13px] text-muted-ink">Cover art is generated once the post is live.</p>
        </aside>

        {/* Fields */}
        <div className="flex flex-col gap-6 px-4 pb-6 pt-6 lg:px-0 lg:pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Post as</legend>
              <div role="radiogroup" className="inline-flex rounded-lg border border-line p-0.5">
                {(["idea", "building"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={stage === s}
                    onClick={() => setStage(s)}
                    className={cn(
                      "h-9 rounded-md px-3.5 text-[13px] font-semibold transition-colors",
                      stage === s ? "bg-ink text-white" : "text-muted-ink hover:bg-sunken hover:text-ink",
                    )}
                  >
                    {s === "idea" ? "Idea" : "Project"}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Kind of work</legend>
              <div role="radiogroup" className="flex flex-wrap gap-1.5">
                {types.map((t) => {
                  const on = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setType(t)}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
                        on
                          ? "border-ink text-ink"
                          : touched && errors.type
                            ? "border-cool text-muted-ink"
                            : "border-line text-muted-ink hover:border-ink/30 hover:text-ink",
                      )}
                    >
                      <DisciplineMark type={t} className={on ? "" : "opacity-40"} />
                      {typeLabel[t]}
                    </button>
                  );
                })}
              </div>
              {err(errors.type)}
            </fieldset>
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-semibold">
              Title
            </label>
            <input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short name people will remember"
              aria-invalid={touched && !!errors.title}
              className={cn(input, "h-11", touched && errors.title ? "border-cool" : "border-line")}
            />
            {err(errors.title)}
          </div>

          <div>
            <label htmlFor="summary" className="mb-2 block text-sm font-semibold">
              Caption
            </label>
            <textarea
              id="summary"
              rows={3}
              maxLength={600}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What it is and who it's for, in a sentence or two"
              aria-invalid={touched && !!errors.summary}
              className={cn(input, "resize-none py-2.5 leading-relaxed", touched && errors.summary ? "border-cool" : "border-line")}
            />
            {err(errors.summary)}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Looking for</p>
            {needs.length > 0 && (
              <ul className="mb-2 flex flex-col divide-y divide-line rounded-lg border border-line">
                {needs.map((n, i) => (
                  <li key={n.skill.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold sm:w-40">
                      <DisciplineMark type={n.skill.category} />
                      <span className="truncate">{n.skill.name}</span>
                    </span>
                    <label className="sr-only" htmlFor={`note-${n.skill.id}`}>
                      What you need from {n.skill.name}
                    </label>
                    <input
                      id={`note-${n.skill.id}`}
                      value={n.note}
                      maxLength={200}
                      onChange={(e) => setNeeds(needs.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                      placeholder="What exactly? (optional)"
                      className={cn(input, "h-9 min-w-0 flex-1 border-line text-sm")}
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex h-9 items-center gap-1 rounded-lg border border-line px-2 text-sm hover:border-ink/30 focus-within:border-ink">
                        <span className="text-muted-ink" aria-hidden>
                          {TOLKEN}
                        </span>
                        <span className="sr-only">Bounty in Tolken for {n.skill.name}</span>
                        <input
                          inputMode="numeric"
                          value={n.bounty}
                          onChange={(e) =>
                            setNeeds(needs.map((x, j) => (j === i ? { ...x, bounty: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) } : x)))
                          }
                          placeholder="Bounty"
                          className="w-16 bg-transparent outline-none placeholder:text-muted-ink"
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove ${n.skill.name}`}
                        onClick={() => setNeeds(needs.filter((_, j) => j !== i))}
                        className="flex size-9 items-center justify-center rounded-md text-muted-ink hover:bg-sunken hover:text-ink"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <SkillPicker
              exclude={needs.map((n) => n.skill.id)}
              onAdd={(skill) => setNeeds([...needs, { skill, note: "", bounty: "" }])}
              invalid={touched && !!errors.needs}
            />
            {err(errors.needs)}
            {bountyTotal > 0 && (
              <p className={cn("mt-1.5 text-[13px]", bountyTotal > balance ? "text-cool" : "text-muted-ink")}>
                Bounties total {TOLKEN} {bountyTotal} and you have {TOLKEN} {balance}. You fund each one later from the Needs tab.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tag" className="mb-2 block text-sm font-semibold">
              Tags <span className="font-normal text-muted-ink">(optional, up to 10)</span>
            </label>
            {tags.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <li key={t} className="flex h-8 items-center gap-0.5 rounded-md border border-line pl-2.5 pr-0.5 text-[13px]">
                    #{t}
                    <button
                      type="button"
                      aria-label={`Remove ${t}`}
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="flex size-7 items-center justify-center rounded text-muted-ink hover:bg-sunken hover:text-ink"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              id="tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") addTag(e);
              }}
              onBlur={(e) => {
                if (tagDraft.trim()) addTag(e);
              }}
              disabled={tags.length >= 10}
              placeholder="Type a tag and press Enter"
              className={cn(input, "h-10 border-line text-sm")}
            />
          </div>

          {stage === "idea" && (
            <div>
              <label htmlFor="readme" className="mb-2 block text-sm font-semibold">
                README <span className="font-normal text-muted-ink">(optional, markdown)</span>
              </label>
              <textarea
                id="readme"
                rows={5}
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                placeholder={"## The problem\n\n## The plan"}
                className={cn(input, "resize-y border-line py-2.5 font-mono text-[13px] leading-relaxed")}
              />
            </div>
          )}

          {me && me.offers.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">You bring</p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                {me.offers.map((o) => (
                  <span key={o.skill.id}>{o.skill.name}</span>
                ))}
                <Link href="/u/me" className="font-semibold text-muted-ink hover:text-ink hover:underline">
                  Edit
                </Link>
              </p>
            </div>
          )}

          {stage === "idea" && (
            <div className="border-t border-line pt-5">
              <ChecksToggle value={checks} onChange={setChecks} />
            </div>
          )}

          {submitButton("hidden lg:flex")}
        </div>
      </div>

      {/* Mobile submit, pinned above the tab bar */}
      <div className="sticky bottom-16 border-t border-line bg-white px-4 py-3 lg:hidden">{submitButton("")}</div>
    </form>
  );
}
