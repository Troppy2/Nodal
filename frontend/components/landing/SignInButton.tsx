"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { hasOnboarded } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Auth is not wired yet. Sign in sends first-time visitors to onboarding
 * and returning ones (onboarding finished in this browser) straight to the feed.
 */
export function SignInButton({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function signIn() {
    setPending(true);
    router.push(hasOnboarded() ? "/feed" : "/onboarding");
  }

  return (
    <button
      onClick={signIn}
      disabled={pending}
      onMouseEnter={() => {
        router.prefetch("/feed");
        router.prefetch("/onboarding");
      }}
      className={cn(variant === "primary" ? cn(btn.primary, "h-12 px-6 text-[15px]") : btn.ghost)}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Sign in
    </button>
  );
}
