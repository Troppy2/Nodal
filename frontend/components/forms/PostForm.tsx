"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Shuffle, Upload } from "lucide-react";
import { toast } from "sonner";
import { ChecksToggle, submitLabel, type Checks } from "@/components/checks/ChecksToggle";
import { CoverArt } from "@/components/feed/CoverArt";
import { DisciplineMark, Label, ProjectMeta } from "@/components/Meta";
import { typeLabel } from "@/lib/cover";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import type { CoverPattern, ProjectType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SkillPicker } from "./SkillPicker";

const patterns: CoverPattern[] = ["rings", "bars", "blocks", "stripes", "dots"];
const types: ProjectType[] = ["software", "hardware", "creative"];
const input =
  "w-full rounded-lg border bg-white px-3 text-[15px] text-ink outline-none placeholder:text-muted-ink focus:border-ink";

/** Create screen: one form for ideas and projects, with a live preview of the post. */
export function PostForm() {
  const router = useRouter();
  const { mySkills } = useDemoStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idea" | "building">("idea");
  const [disciplines, setDisciplines] = useState<ProjectType[]>(["creative", "hardware"]);
  const [title, setTitle] = useState("Soil Choir");
  const [caption, setCaption] = useState(
    "A soil sensor that turns your plant's moisture into generative music. Dry soil sounds sparse and tense. Watered soil blooms.",
  );
  const [needs, setNeeds] = useState(["ESP32 firmware", "Sound design", "Generative art"]);
  const [pattern, setPattern] = useState<CoverPattern>("rings");
  const [shuffles, setShuffles] = useState(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [checks, setChecks] = useState<Checks>({ market: true, cool: true });
  const [touched, setTouched] = useState(false);

  const errors = {
    title: !title.trim() ? "Give it a title." : null,
    caption: !caption.trim() ? "Say what it is in a sentence or two." : null,
    disciplines: disciplines.length === 0 ? "Pick at least one." : null,
  };
  const valid = !errors.title && !errors.caption && !errors.disciplines;
  // Checks run on ideas only; a project post skips them.
  const activeChecks: Checks = stage === "idea" ? checks : { market: false, cool: false };
  const label = stage === "idea" ? submitLabel(activeChecks) : "Post project";
  const cover = { pattern, tint: disciplines[0] ?? "software" };
  const seed = `${title.trim().toLowerCase()}#${shuffles}`;

  function toggleDiscipline(t: ProjectType) {
    setDisciplines((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]));
  }

  function shuffle() {
    setCoverUrl(null);
    setPattern((p) => patterns[(patterns.indexOf(p) + 1) % patterns.length]);
    setShuffles((n) => n + 1);
  }

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Use an image under 5 MB.");
      return;
    }
    setCoverUrl(URL.createObjectURL(file));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    // Demo only until the API is wired: POST /projects, then POST /projects/{id}/research with the chosen checks.
    const ran = activeChecks.market || activeChecks.cool;
    toast.success("Posted (demo)", { description: ran ? "Checks are running. People who fit are below." : undefined });
    router.push(ran ? "/projects/soil-choir/results" : "/projects/soil-choir");
  }

  const err = (msg: string | null) => touched && msg && <p className="mt-1.5 text-[13px] text-cool">{msg}</p>;

  return (
    <form onSubmit={submit} noValidate aria-label="New post">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-2 lg:hidden">
        <Link href="/feed" className="flex h-11 items-center px-2 text-[15px] text-muted-ink">
          Cancel
        </Link>
        <h1 className="text-base font-bold">New post</h1>
        <button type="submit" className="flex h-11 items-center px-2 text-[15px] font-bold text-teal">
          Post
        </button>
      </header>

      <h1 className="mb-6 hidden text-[28px] font-extrabold tracking-[-0.02em] lg:block">New post</h1>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
        {/* Preview */}
        <aside className="px-4 pt-5 lg:sticky lg:top-8 lg:h-fit lg:px-0 lg:pt-0">
          <Label className="mb-2 max-lg:hidden">Preview</Label>
          <div className="overflow-hidden rounded-xl border border-line">
            <CoverArt cover={cover} seed={seed} coverUrl={coverUrl} className="aspect-[2/1]" />
            <div className="p-4">
              <p className="truncate text-lg font-extrabold leading-tight tracking-[-0.02em]">{title.trim() || "Untitled"}</p>
              <ProjectMeta
                project={{ disciplines: disciplines.length ? disciplines : ["software"], stage, source: "none" }}
                className="mt-1.5"
              />
              {needs.length > 0 && (
                <p className="mt-2 text-[13px] text-muted-ink">
                  Looking for <span className="text-ink">{needs.join(", ")}</span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className={btn.secondary} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Upload cover
            </button>
            <button type="button" className={btn.secondary} onClick={shuffle}>
              <Shuffle className="size-4" /> Shuffle art
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          </div>
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
                      stage === s ? "bg-ink text-white" : "text-muted-ink hover:text-ink",
                    )}
                  >
                    {s === "idea" ? "Idea" : "Project"}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Disciplines</legend>
              <div className="flex flex-wrap gap-1.5">
                {types.map((t) => {
                  const on = disciplines.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDiscipline(t)}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
                        on ? "border-ink text-ink" : "border-line text-muted-ink hover:text-ink",
                      )}
                    >
                      <DisciplineMark type={t} className={on ? "" : "opacity-40"} />
                      {typeLabel[t]}
                    </button>
                  );
                })}
              </div>
              {err(errors.disciplines)}
            </fieldset>
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-semibold">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={touched && !!errors.title}
              className={cn(input, "h-11", touched && errors.title ? "border-cool" : "border-line")}
            />
            {err(errors.title)}
          </div>

          <div>
            <label htmlFor="caption" className="mb-2 block text-sm font-semibold">
              Caption
            </label>
            <textarea
              id="caption"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              aria-invalid={touched && !!errors.caption}
              className={cn(input, "resize-none py-2.5 leading-relaxed", touched && errors.caption ? "border-cool" : "border-line")}
            />
            {err(errors.caption)}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Looking for</p>
            <SkillPicker value={needs} onChange={setNeeds} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">You bring</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-ink">
              {mySkills.map((skill) => (
                <span key={skill} className="text-ink">
                  {skill}
                </span>
              ))}
              <Link href="/u/me" className="font-semibold text-ink hover:underline">
                Edit
              </Link>
            </p>
          </div>

          {stage === "idea" && (
            <div className="border-t border-line pt-5">
              <ChecksToggle value={checks} onChange={setChecks} />
            </div>
          )}

          <button type="submit" className={cn(btn.primary, "hidden h-12 w-full text-[15px] lg:flex")}>
            {label}
          </button>
        </div>
      </div>

      {/* Mobile submit, pinned above the tab bar */}
      <div className="sticky bottom-16 border-t border-line bg-white px-4 py-3 lg:hidden">
        <button type="submit" className={cn(btn.primary, "h-12 w-full text-[15px]")}>
          {label}
        </button>
      </div>
    </form>
  );
}
