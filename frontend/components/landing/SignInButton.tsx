"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** Where someone goes after signing in: onboarding until they've added skills, then the feed. */
function useAfterSignIn() {
  const router = useRouter();
  return (onboarded: boolean) => router.push(onboarded ? "/feed" : "/onboarding");
}

/**
 * Sign in is a name only. First visit: type a name and go to onboarding.
 * Returning in this browser: one button continues the existing session.
 */
export function SignInForm() {
  const { ready, signedIn, me, signIn, signOut } = useSession();
  const go = useAfterSignIn();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter the name people will see.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await signIn(name);
      go(next.onboarded);
    } catch (err) {
      setPending(false);
      toast.error((err as Error).message);
    }
  }

  if (!ready) return <div className="h-12 w-full max-w-[420px] animate-pulse rounded-lg bg-sunken" aria-hidden />;

  if (signedIn && me) {
    const display = me.profile.display_name || me.profile.handle;
    return (
      <div className="flex flex-col items-start gap-3">
        <button
          className={cn(btn.primary, "h-12 px-6 text-[15px]")}
          onClick={() => {
            setPending(true);
            go(me.onboarded);
          }}
          disabled={pending}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Continue as {display}
        </button>
        <button onClick={signOut} className="rounded-md text-[13px] font-semibold text-muted-ink hover:text-ink hover:underline">
          Not {display}? Use a different name
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-[420px] flex-col gap-2" noValidate>
      <label htmlFor="name" className="text-sm font-semibold">
        Your name
      </label>
      <div className="flex gap-2 max-sm:flex-col">
        <input
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          maxLength={60}
          autoComplete="name"
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "name-error" : "name-hint"}
          className="h-12 min-w-0 flex-1 rounded-lg border border-line px-4 text-[15px] outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink aria-invalid:border-red-600"
        />
        <button type="submit" disabled={pending} className={cn(btn.primary, "h-12 px-6 text-[15px]")}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
      </div>
      {error ? (
        <p id="name-error" className="text-[13px] text-red-700">
          {error}
        </p>
      ) : (
        <p id="name-hint" className="text-[13px] text-muted-ink">
          No email or password. Your session stays in this browser.
        </p>
      )}
    </form>
  );
}

/** Header link: jumps to the form, or continues the session. */
export function SignInButton({ variant = "ghost" }: { variant?: "primary" | "ghost" }) {
  const { ready, signedIn, me } = useSession();
  const go = useAfterSignIn();
  if (ready && signedIn && me) {
    return (
      <button className={variant === "primary" ? btn.primary : btn.ghost} onClick={() => go(me.onboarded)}>
        Open Nodal
      </button>
    );
  }
  return (
    <Link href="#sign-in" className={variant === "primary" ? btn.primary : btn.ghost}>
      Sign in
    </Link>
  );
}
