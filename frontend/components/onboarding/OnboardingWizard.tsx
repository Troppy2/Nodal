"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Plus, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { DisciplineMark } from "@/components/Meta";
import { ErrorState } from "@/components/project/states";
import { Logo } from "@/components/shell/Logo";
import { api } from "@/lib/api";
import type { MeOut, ProfileLite, ProjectList, Skill } from "@/lib/api-types";
import { typeLabel } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const steps = [
  { id: "skills", title: "What do you bring?", blurb: "Pick the skills you'd offer and how strong you are at each. Matching uses these to find projects that need you." },
  { id: "interests", title: "What are you into?", blurb: "Tags steer recommendations and which ideas we show you first." },
  { id: "follow", title: "Follow a few people", blurb: "Their projects show up in your Following tab." },
] as const;

const levelLabel = { 1: "Learning", 2: "Solid", 3: "Expert" } as const;

/** Three steps that build what matching reads: offers with levels, interests, and follows. */
export function OnboardingWizard() {
  const router = useRouter();
  const { ready, signedIn, me, refreshMe } = useSession();
  const skills = useApi<Skill[]>("/skills");
  const projects = useApi<ProjectList>("/projects?page=1");

  const [step, setStep] = useState(0);
  const [levels, setLevels] = useState<Record<number, 1 | 2 | 3>>({});
  const [interests, setInterests] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [busyFollow, setBusyFollow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Signed-out visitors start at the landing page.
  useEffect(() => {
    if (ready && !signedIn) router.replace("/");
  }, [ready, signedIn, router]);

  // Pre-fill from an existing profile (someone redoing onboarding from the feed prompt).
  useEffect(() => {
    if (!me || seeded) return;
    setLevels(Object.fromEntries(me.offers.map((o) => [o.skill.id, o.level])));
    setInterests(me.interests);
    setSeeded(true);
  }, [me, seeded]);

  const tagChoices = useMemo(() => {
    const all = new Set<string>(interests);
    for (const p of projects.data?.items ?? []) p.tags.forEach((t) => all.add(t));
    return [...all].sort();
  }, [projects.data, interests]);

  const owners = useMemo(() => {
    const seen = new Map<string, { person: ProfileLite; skills: string[] }>();
    for (const p of projects.data?.items ?? []) {
      if (p.owner.id === me?.profile.id || seen.has(p.owner.id)) continue;
      seen.set(p.owner.id, { person: p.owner, skills: [p.title] });
    }
    return [...seen.values()].slice(0, 8);
  }, [projects.data, me]);

  const byCategory = useMemo(() => {
    const groups: Record<string, Skill[]> = { software: [], hardware: [], creative: [] };
    const q = skillQuery.trim().toLowerCase();
    for (const s of skills.data ?? []) if (!q || s.name.toLowerCase().includes(q)) groups[s.category].push(s);
    return groups;
  }, [skills.data, skillQuery]);
  const anyMatch = byCategory.software.length + byCategory.hardware.length + byCategory.creative.length > 0;

  const picked = Object.keys(levels).length;
  const current = steps[step];
  const canContinue = step === 0 ? picked > 0 : step === 1 ? interests.length > 0 : true;

  function toggleSkill(id: number) {
    setLevels((l) => {
      const next = { ...l };
      if (next[id]) delete next[id];
      else next[id] = 2;
      return next;
    });
  }

  function addCustomTag() {
    const tag = customTag.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!tag) return;
    if (!interests.includes(tag) && interests.length < 10) setInterests((t) => [...t, tag]);
    setCustomTag("");
  }

  async function toggleFollow(person: ProfileLite) {
    const on = following.has(person.id);
    setBusyFollow(person.id);
    try {
      await api(`/profiles/${person.id}/follow`, { method: on ? "DELETE" : "POST" });
      setFollowing((f) => {
        const next = new Set(f);
        if (on) next.delete(person.id);
        else next.add(person.id);
        return next;
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyFollow(null);
    }
  }

  async function next() {
    setSaving(true);
    try {
      if (step === 0) {
        await api<MeOut>("/me/offers", {
          method: "PUT",
          body: Object.entries(levels).map(([skill_id, level]) => ({ skill_id: Number(skill_id), level })),
        });
      } else if (step === 1) {
        await api<MeOut>("/me/interests", { method: "PUT", body: { interests } });
      }
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        await refreshMe();
        invalidate("/");
        toast.success("Profile ready", { description: "Matching now uses your skills and interests." });
        router.push("/feed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !signedIn) {
    return <div className="min-h-dvh" aria-busy="true" />;
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh max-w-[680px] flex-col px-5 py-7">
        <header className="flex items-center justify-between">
          <Logo />
          {me?.onboarded && (
            <Link href="/feed" className="rounded-md text-[13px] font-semibold text-muted-ink hover:text-ink hover:underline">
              Back to feed
            </Link>
          )}
        </header>

        <div className="mt-7">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.id} className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-ink" : "bg-line")} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        <main className="mt-6 flex-1">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
            {step === 0 && me?.profile.display_name ? `Hi ${me.profile.display_name}. ` : ""}
            {current.title}
          </h1>
          <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-muted-ink">{current.blurb}</p>

          {current.id === "skills" &&
            (skills.error && !skills.data ? (
              <ErrorState className="mt-6" message={skills.error.message} onRetry={skills.reload} />
            ) : !skills.data ? (
              <div className="mt-6 flex flex-wrap gap-1.5" aria-hidden>
                {Array.from({ length: 18 }, (_, i) => (
                  <span key={i} className="h-10 w-28 animate-pulse rounded-md bg-sunken" />
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-6">
                {picked > 0 && (
                  <section className="rounded-xl border border-line p-4" aria-label="Your skills">
                    <h2 className="text-sm font-semibold">Your skills</h2>
                    <p className="text-[13px] text-muted-ink">Set how strong you are at each. Matching ranks you higher where you&apos;re stronger.</p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {(skills.data ?? [])
                        .filter((s) => levels[s.id])
                        .map((s) => (
                          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-sm">
                              <button
                                type="button"
                                onClick={() => toggleSkill(s.id)}
                                aria-label={`Remove ${s.name}`}
                                className="flex size-7 items-center justify-center rounded-md text-muted-ink hover:bg-sunken hover:text-ink"
                              >
                                <X className="size-3.5" />
                              </button>
                              {s.name}
                            </span>
                            <span role="radiogroup" aria-label={`${s.name} level`} className="flex rounded-md border border-line p-0.5">
                              {([1, 2, 3] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  role="radio"
                                  aria-checked={levels[s.id] === lvl}
                                  onClick={() => setLevels((l) => ({ ...l, [s.id]: lvl }))}
                                  className={cn(
                                    "h-8 rounded px-2.5 text-xs font-semibold transition-colors",
                                    levels[s.id] === lvl ? "bg-ink text-white" : "text-muted-ink hover:bg-sunken hover:text-ink",
                                  )}
                                >
                                  {levelLabel[lvl]}
                                </button>
                              ))}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </section>
                )}
                <label className="relative block">
                  <span className="sr-only">Search skills</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink" />
                  <input
                    type="search"
                    value={skillQuery}
                    onChange={(e) => setSkillQuery(e.target.value)}
                    placeholder="Search skills, e.g. firmware"
                    className="h-11 w-full rounded-lg border border-line pl-9 pr-3 text-[15px] outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink"
                  />
                </label>
                {!anyMatch && <p className="text-sm text-muted-ink">No skill matches &ldquo;{skillQuery}&rdquo;.</p>}
                {(["software", "hardware", "creative"] as const).filter((cat) => byCategory[cat].length > 0).map((cat) => (
                  <section key={cat}>
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <DisciplineMark type={cat} /> {typeLabel[cat]}
                    </h2>
                    <ul className="flex flex-wrap gap-1.5">
                      {byCategory[cat].map((s) => {
                        const on = Boolean(levels[s.id]);
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleSkill(s.id)}
                              className={cn(
                                "flex h-10 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
                                on ? "border-teal bg-teal-tint text-teal" : "border-line text-ink hover:border-ink",
                              )}
                            >
                              {on && <Check className="size-3.5" />}
                              {s.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}

              </div>
            ))}

          {current.id === "interests" && (
            <div className="mt-6">
              <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
                {tagChoices.map((tag) => {
                  const on = interests.includes(tag);
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={!on && interests.length >= 10}
                        onClick={() => setInterests((s) => (on ? s.filter((x) => x !== tag) : [...s, tag]))}
                        className={cn(
                          "flex h-10 items-center rounded-md border px-3 text-[13px] font-medium transition-colors disabled:opacity-40",
                          on ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-ink",
                        )}
                      >
                        #{tag}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <form
                className="mt-4 flex max-w-sm gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustomTag();
                }}
              >
                <label htmlFor="tag" className="sr-only">
                  Add your own tag
                </label>
                <input
                  id="tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add your own, e.g. synths"
                  maxLength={30}
                  className="h-10 min-w-0 flex-1 rounded-md border border-line px-3 text-[13px] outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink"
                />
                <button type="submit" className={cn(btn.secondary, "h-10")} disabled={!customTag.trim() || interests.length >= 10}>
                  <Plus className="size-4" /> Add
                </button>
              </form>
              <p className="mt-2 text-[13px] text-muted-ink">{interests.length} of 10 picked</p>
            </div>
          )}

          {current.id === "follow" &&
            (projects.error && !projects.data ? (
              <ErrorState className="mt-6" message={projects.error.message} onRetry={projects.reload} />
            ) : !projects.data ? (
              <div className="mt-6 space-y-3" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-sunken" />
                ))}
              </div>
            ) : owners.length === 0 ? (
              <p className="mt-6 text-sm text-muted-ink">Nobody to suggest yet. You can follow people from their profiles later.</p>
            ) : (
              <ul className="mt-6 flex flex-col divide-y divide-line border-y border-line">
                {owners.map(({ person, skills: works }) => {
                  const on = following.has(person.id);
                  return (
                    <li key={person.id} className="flex items-center gap-3 py-3">
                      <Avatar person={person} size={40} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[15px] font-semibold">{person.display_name || person.handle}</p>
                        <p className="truncate text-[13px] text-muted-ink">Building {works.join(", ")}</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={busyFollow === person.id}
                        onClick={() => toggleFollow(person)}
                        className={on ? cn(btn.secondary, "h-9") : cn(btn.match, "h-9")}
                      >
                        {busyFollow === person.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : on ? (
                          <Check className="size-4" />
                        ) : (
                          <UserPlus className="size-4" />
                        )}
                        {on ? "Following" : "Follow"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ))}
        </main>

        <footer className="sticky bottom-0 mt-6 border-t border-line bg-white py-4">
          {!canContinue && (
            <p className="pb-3 text-center text-[13px] text-muted-ink">
              {step === 0 ? "Pick at least one skill to continue." : "Pick at least one interest to continue."}
            </p>
          )}
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} disabled={saving} className={cn(btn.secondary, "h-12")}>
                <ArrowLeft className="size-4" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canContinue || saving}
              className={cn(btn.primary, "h-12 flex-1 text-[15px]")}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {step === steps.length - 1 ? "Finish setup" : "Continue"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
