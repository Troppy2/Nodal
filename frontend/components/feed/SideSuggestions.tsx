"use client";

import Link from "next/link";
import { ArrowLeftRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Label } from "@/components/Meta";
import { me, neededMost, offers, people } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";

const swaps = [
  { person: people.maya, gives: "Firmware", gets: "UI design", kind: "Swap" },
  { person: people.dev, gives: "Sound", gets: "UI design", kind: "3-way ring" },
  { person: people.rin, gives: "Gen. art", gets: "via dev", kind: "3-way ring" },
];

export function SideSuggestions() {
  const { invited, add } = useDemoStore();
  return (
    <aside className="sticky top-6 hidden h-fit w-[290px] shrink-0 flex-col gap-7 pt-4 xl:flex">
      <Link href="/u/me" className="flex items-center gap-3">
        <Avatar person={me} size={40} />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-bold">{me.handle}</p>
          <p className="truncate text-[13px] text-muted-ink">{offers.inah.map((o) => o.skill).join(" · ")}</p>
        </div>
      </Link>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <Label>Swaps ready for you</Label>
          <Link href="/inbox" className="text-[13px] font-semibold hover:underline">
            Inbox
          </Link>
        </div>
        <ul className="flex flex-col gap-4">
          {swaps.map(({ person, gives, gets, kind }) => {
            const done = invited.has(person.handle);
            return (
              <li key={person.handle} className="flex items-center gap-3">
                <Link href={`/u/${person.handle}`}>
                  <Avatar person={person} size={36} />
                </Link>
                <div className="min-w-0 flex-1 leading-snug">
                  <p className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                    {person.handle}
                    <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-teal">{kind}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate text-[13px] text-muted-ink">
                    {gives} <ArrowLeftRight className="size-3 shrink-0" /> {gets}
                  </p>
                </div>
                {done ? (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-teal">
                    <Check className="size-3.5" /> Sent
                  </span>
                ) : (
                  <button
                    className="h-8 rounded-md px-2 text-[13px] font-semibold text-teal hover:bg-teal-tint"
                    onClick={() => {
                      add("invited", person.handle);
                      toast.success(`Invite sent to ${person.handle}`);
                    }}
                  >
                    Invite
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <Label className="mb-3">Most needed right now</Label>
        <div className="flex flex-wrap gap-1.5">
          {neededMost.map((s) => (
            <Link
              key={s}
              href={`/explore?q=${encodeURIComponent(s)}`}
              className="rounded-md border border-line px-2.5 py-1 text-[13px] font-medium hover:border-ink"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
