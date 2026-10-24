"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Must render inside a <Link>. Shows a small teal bar while that link's route is loading,
 * so a tap gets feedback before the next page is ready.
 */
export function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-0.5 rounded-full bg-teal transition-opacity duration-150",
        pending ? "animate-pulse opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
