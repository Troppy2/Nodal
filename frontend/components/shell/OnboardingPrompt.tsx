"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useDemoStore } from "@/lib/store";

/** Nudge until onboarding is done: matching needs skills, interests, and a few follows. */
export function OnboardingPrompt() {
  const { onboarded } = useDemoStore();
  if (onboarded) return null;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-teal/30 bg-teal-tint px-4 py-3">
      <Sparkles className="size-5 shrink-0 text-teal" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-semibold">Finish your profile.</span>{" "}
        <span className="text-muted-ink">Pick skills and interests so matching and follow suggestions work.</span>
      </p>
      <Link href="/onboarding" className="shrink-0 text-[13px] font-bold text-teal hover:underline">
        Start
      </Link>
    </div>
  );
}
