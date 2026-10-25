"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Label } from "@/components/Meta";
import type { Story } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

function firstName(person: { display_name: string | null; handle: string }) {
  return (person.display_name || person.handle).split(" ")[0];
}

/** People one swap or ring away, then people you follow. A tile row, not a second feed. */
export function StoryRow() {
  const { ready, signedIn } = useSession();
  const { data, loading } = useApi<Story[]>(signedIn ? "/feed/stories" : null);
  const stories = data ?? [];
  const empty = !!data && stories.length === 0;

  // Guests get the sign-in prompt in the composer and feed instead of an empty stories strip.
  if (ready && !signedIn) return null;

  return (
    <section aria-labelledby="stories-title" className="mx-4 mt-3 rounded-xl border border-line bg-white lg:mx-0">
      <header className="flex items-center justify-between px-4 pt-3">
        <Label>
          <span id="stories-title">People to build with</span>
        </Label>
        <Link href="/explore" className="text-[13px] font-semibold text-muted-ink transition-colors hover:text-ink">
          Find people
        </Link>
      </header>

      <div className="flex gap-1 overflow-x-auto px-2 pb-3 pt-2 [scrollbar-width:none]">
        {loading &&
          !data &&
          Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 px-1 py-1" aria-hidden>
              <span className="size-[52px] animate-pulse rounded-full bg-sunken" />
              <span className="h-3 w-12 animate-pulse rounded bg-sunken" />
            </span>
          ))}

        {stories.map(({ profile, tag, trade }) => (
          <Link
            key={profile.id}
            href={tag ? "/requests" : `/u/${profile.handle}`}
            title={trade ?? undefined}
            className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-sunken"
          >
            <Avatar person={profile} size={52} ring={tag !== null} />
            <span className="flex max-w-full flex-col items-center leading-tight">
              <span className="max-w-full truncate text-xs font-medium">{firstName(profile)}</span>
              <span className={cn("max-w-full truncate text-[11px]", tag ? "font-semibold text-teal" : "text-muted-ink")}>
                {tag === "ring" ? "Ring" : tag === "swap" ? "Swap" : `@${profile.handle}`}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {empty && (
        <p className="border-t border-line px-4 py-3 text-[13px] leading-snug text-muted-ink">
          No swaps or rings yet. Post what you&apos;re building and the people who fit will show up here.
        </p>
      )}
    </section>
  );
}
