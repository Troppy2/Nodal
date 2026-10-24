"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/shell/Logo";
import { me, offers, type Handle, people } from "@/lib/catalog";
import { allSkills, interestTags } from "@/lib/skills";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

const steps = [
  { id: "skills", title: "What do you bring?", blurb: "Pick the skills you'd offer. Matching uses these to find ideas that need you." },
  { id: "interests", title: "What are you into?", blurb: "Tags steer recommendations and the people we suggest next." },
  { id: "follow", title: "Follow a few people", blurb: "Their projects show up in Following, and they can find you by skill." },
] as const;

const suggested: Handle[] = (["maya", "dev", "rin", "leila", "tomas"] as Handle[]).filter((h) => h !== me.handle);

/** Three steps that build the profile the matching algorithm needs: skills, interests, follows. */
export function OnboardingWizard() {
  const router = useRouter();
  const store = useDemoStore();
  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<string[]>(store.mySkills);
  const [interests, setInterests] = useState<string[]>(store.interests);

  const current = steps[step];
  const canContinue = step === 0 ? skills.length > 0 : step === 1 ? interests.length > 0 : true;

  const toggleFrom = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    store.completeOnboarding({ skills, interests });
    toast.success("Profile ready", { description: "Matching now uses your skills and interests." });
    router.push("/feed");
  }

  function skip() {
    store.completeOnboarding({ skills: store.mySkills, interests: store.interests });
    router.push("/feed");
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh max-w-[620px] flex-col px-5 py-7">
        <header className="flex items-center justify-between">
          <Logo />
          <button onClick={skip} className="text-[13px] font-semibold text-muted-ink hover:text-ink">
            Skip for now
          </button>
        </header>

        <div className="mt-7">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.id} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-line")} />
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-ink">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        <main className="mt-6 flex-1">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{current.title}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-ink">{current.blurb}</p>

          {current.id === "skills" && (
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Skills you offer">
              {allSkills.map((skill) => {
                const on = skills.includes(skill);
                return (
                  <li key={skill}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSkills((s) => toggleFrom(s, skill))}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
                        on ? "border-teal bg-teal-tint text-teal" : "border-line text-ink hover:border-ink",
                      )}
                    >
                      {on && <Check className="size-3.5" />}
                      {skill}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {current.id === "interests" && (
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Interests">
              {interestTags.map((tag) => {
                const on = interests.includes(tag);
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setInterests((s) => toggleFrom(s, tag))}
                      className={cn(
                        "flex h-10 items-center rounded-md border px-3 font-mono text-[12px] transition-colors",
                        on ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-ink",
                      )}
                    >
                      #{tag}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {current.id === "follow" && (
            <ul className="mt-6 flex flex-col divide-y divide-line border-y border-line">
              {suggested.map((handle) => {
                const person = people[handle];
                const following = store.following.has(handle);
                return (
                  <li key={handle} className="flex items-center gap-3 py-3">
                    <Link href={`/u/${handle}`}>
                      <Avatar person={person} size={40} />
                    </Link>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[15px] font-semibold">{person.name}</p>
                      <p className="truncate text-[13px] text-muted-ink">
                        {offers[handle].map((o) => o.skill).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={following}
                      onClick={() => store.toggle("following", handle)}
                      className={following ? cn(btn.secondary, "h-9") : cn(btn.match, "h-9")}
                    >
                      {following ? (
                        <>
                          <Check className="size-4" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-4" /> Follow
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        <footer className="sticky bottom-0 mt-6 flex gap-2 border-t border-line bg-white py-4">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className={cn(btn.secondary, "h-12")}
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          <button type="button" onClick={next} disabled={!canContinue} className={cn(btn.primary, "h-12 flex-1 text-[15px]")}>
            {step === steps.length - 1 ? "Finish setup" : "Continue"}
          </button>
        </footer>

        {!canContinue && (
          <p className="pb-3 text-center text-[13px] text-muted-ink">
            {step === 0 ? "Pick at least one skill to continue." : "Pick at least one interest to continue."}
          </p>
        )}
      </div>
    </div>
  );
}
