import Link from "next/link";
import { Mail } from "lucide-react";
import { CoverArt } from "@/components/feed/CoverArt";
import { Logo } from "@/components/shell/Logo";

// Auth is not wired yet; both buttons skip straight to onboarding.
export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center px-4 py-10">
      <CoverArt cover={{ pattern: "rings", tint: "creative" }} className="mb-8 h-36 rounded-2xl" />
      <Logo className="mb-2" />
      <p className="mb-8 text-[15px] text-muted-ink">Find the people your project is missing. Swap skills across software, hardware, and art.</p>
      <Link
        href="/onboarding"
        className="mb-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-white"
      >
        <svg viewBox="0 0 16 16" className="size-5" fill="currentColor" aria-hidden>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Continue with GitHub
      </Link>
      <form className="flex flex-col gap-3">
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="h-12 rounded-xl border border-line px-4 text-[15px] outline-none placeholder:text-muted-ink"
        />
        <Link
          href="/onboarding"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line text-[15px] font-bold"
        >
          <Mail className="size-5" strokeWidth={1.75} /> Email me a magic link
        </Link>
      </form>
      <Link href="/feed" className="mt-6 text-center text-[13px] font-semibold text-muted-ink hover:text-ink">
        Browse without an account
      </Link>
    </div>
  );
}
