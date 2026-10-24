"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Story } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/** People who complete a swap or ring with you come first, ringed in teal; then people you follow. */
export function StoryRow() {
  const { signedIn } = useSession();
  const { data, loading } = useApi<Story[]>(signedIn ? "/feed/stories" : null);
  const stories = data ?? [];

  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-4 [scrollbar-width:none] lg:px-0" aria-label="People to build with">
      <Link href="/create" className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5">
        <span className="flex size-[60px] items-center justify-center rounded-full border-2 border-dashed border-muted-ink/40 text-muted-ink transition-colors group-hover:border-ink group-hover:text-ink">
          <Plus className="size-6" strokeWidth={1.75} />
        </span>
        <span className="text-xs font-medium">Post idea</span>
      </Link>
      {loading &&
        !data &&
        Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5" aria-hidden>
            <span className="size-[60px] animate-pulse rounded-full bg-sunken" />
            <span className="h-3 w-12 animate-pulse rounded bg-sunken" />
          </span>
        ))}
      {stories.map(({ profile, tag, trade }) => (
        <Link
          key={profile.id}
          href={tag ? "/inbox" : `/u/${profile.handle}`}
          title={trade ?? undefined}
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="rounded-full transition-opacity group-hover:opacity-85">
            <Avatar person={profile} size={48} ring={tag !== null} />
          </span>
          <span className="flex max-w-full flex-col items-center leading-tight">
            <span className="max-w-full truncate text-xs font-medium">{profile.display_name || profile.handle}</span>
            <span className={cn("text-xs", tag ? "text-teal" : "invisible")}>{tag === "ring" ? "Ring" : tag === "swap" ? "Swap" : "none"}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
