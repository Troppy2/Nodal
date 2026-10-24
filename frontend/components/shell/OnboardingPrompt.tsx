"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useSession } from "@/lib/session";

/** Nudge signed-in people until they add skills: matching has nothing to work with before that. */
export function OnboardingPrompt() {
  const { me } = useSession();
  if (!me || me.onboarded) return null;
  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-teal/30 bg-teal-tint px-4 py-3 lg:mx-0">
      <Sparkles className="size-5 shrink-0 text-teal" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-semibold">Finish your profile.</span>{" "}
        <span className="text-muted-ink">Add the skills you offer so matching can find projects that need you.</span>
      </p>
      <Link href="/onboarding" className="shrink-0 rounded-md px-2 py-1 text-[13px] font-bold text-teal hover:bg-white/60">
        Start
      </Link>
    </div>
  );
}
