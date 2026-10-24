"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** "3h ago" style relative time from an ISO timestamp. */
export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [
    [60, "m"],
    [60, "h"],
    [24, "d"],
    [7, "w"],
    [4.35, "mo"],
    [12, "y"],
  ];
  let v = s;
  let label = "s";
  for (const [div, unit] of units) {
    if (v < div) break;
    v /= div;
    label = unit;
  }
  return `${Math.floor(v)}${label} ago`;
}

/** Dashed box for an empty list, with an optional next step. */
export function EmptyState({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-10 text-center", className)}>
      <p className="max-w-sm text-sm text-muted-ink">{children}</p>
      {action}
    </div>
  );
}

/** A request failed: say what, offer Retry. */
export function ErrorState({ message, onRetry, className }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-line px-6 py-10 text-center", className)}>
      <p className="max-w-sm text-sm">
        <span className="font-semibold">Couldn&apos;t load this.</span> <span className="text-muted-ink">{message}</span>
      </p>
      <button className={btn.secondary} onClick={onRetry}>
        <RotateCw className="size-4" /> Retry
      </button>
    </div>
  );
}

/** Shown where an action needs a signed-in viewer. Sign-in is a name only, on the landing page. */
export function SignInPrompt({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState
      action={
        <Link href="/" className={btn.primary}>
          Sign in
        </Link>
      }
    >
      {children}
    </EmptyState>
  );
}
