"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Link2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { ProjectGrid } from "@/components/explore/ProjectTile";
import { Label } from "@/components/Meta";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { type Handle, me, offers, people, projects, projectsBy } from "@/lib/catalog";
import { formatTolken } from "@/lib/cover";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { ContributionGraph } from "./ContributionGraph";
import { OfferEditor } from "./OfferEditor";
import { bios, cycles, followers, tolkenHistory } from "./profileData";

type Tab = "projects" | "ideas" | "starred" | "tolken";

export function ProfileView({ handle }: { handle: Handle }) {
  const person = people[handle];
  const own = handle === me.handle;
  const store = useDemoStore();
  const [tab, setTab] = useState<Tab>("projects");

  const owned = projectsBy(handle);
  const builds = owned.filter((p) => p.stage !== "idea");
  const ideas = owned.filter((p) => p.stage === "idea");
  const starred = projects.filter((p) => store.starred.has(p.id));
  const stars = owned.reduce((s, p) => s + p.stars + (store.starred.has(p.id) ? 1 : 0), 0);
  const collabs = projects.filter((p) => p.owner.handle !== handle && p.memberHandles.includes(handle)).length;
  const isFollowing = store.following.has(handle);
  const followerCount = followers[handle] + (isFollowing ? 1 : 0);
  const invited = store.invited.has(handle);
  const earned = tolkenHistory.filter((e) => e.status === "Released").reduce((s, e) => s + e.amount_tolken, 0);
  // The viewer's offers come from onboarding; everyone else's come from the catalog.
  const myOffers = own && store.onboarded ? store.mySkills.map((skill) => ({ skill, level: 2 as const })) : offers[handle];

  async function share() {
    const url = `${window.location.origin}/u/${handle}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast(url);
    }
  }

  const actions = own ? (
    <button className={btn.secondary} onClick={share}>
      <Link2 className="size-4" /> Share profile
    </button>
  ) : (
    <>
      <button
        aria-pressed={isFollowing}
        className={isFollowing ? btn.secondary : btn.primary}
        onClick={() => store.toggle("following", handle)}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
      {invited ? (
        <span className={btn.done}>
          <Check className="size-4" /> Invited
        </span>
      ) : (
        <button
          className={btn.match}
          onClick={() => {
            store.add("invited", handle);
            toast.success(`Invite sent to ${handle}`, { description: "They'll see it in their inbox." });
          }}
        >
          <UserPlus className="size-4" /> Invite to build
        </button>
      )}
    </>
  );

  const facts: [number | string, string][] = [
    [owned.length, owned.length === 1 ? "project" : "projects"],
    [stars, "stars"],
    [collabs, collabs === 1 ? "collab" : "collabs"],
    [followerCount, "followers"],
  ];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "projects", label: "Projects", count: builds.length },
    { id: "ideas", label: "Ideas", count: ideas.length },
    ...(own
      ? [
          { id: "starred" as const, label: "Starred", count: starred.length },
          { id: "tolken" as const, label: "Tolken" },
        ]
      : []),
  ];

  return (
    <>
      <MobileHeader title={`@${handle}`} back={own ? null : "/feed"} />
      <div className="mx-auto max-w-[920px] px-4 py-6 lg:px-8 lg:py-10">
        {/* Header */}
        <header className="flex gap-5 lg:gap-8">
          <Avatar person={person} size={72} className="lg:hidden" />
          <Avatar person={person} size={104} className="max-lg:hidden" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[28px]">{person.name}</h1>
            <p className="font-mono text-[13px] text-muted-ink">@{handle}</p>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed max-lg:hidden">{bios[handle]}</p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-ink">
              {facts.map(([n, label]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dd className="text-[13px] font-medium text-ink">{n}</dd>
                  <dt>{label}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-4 hidden gap-2 lg:flex">{actions}</div>
          </div>
        </header>
        <p className="mt-4 text-[15px] leading-relaxed lg:hidden">{bios[handle]}</p>
        <div className="mt-4 grid auto-cols-fr grid-flow-col gap-2 lg:hidden">{actions}</div>

        {/* Offers and cycles */}
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 border-t border-line pt-6 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-6">
            <OfferEditor initial={myOffers} editable={own} />
            {own && store.interests.length > 0 && (
              <section>
                <Label className="mb-2.5">Interests</Label>
                <ul className="flex flex-wrap gap-1.5">
                  {store.interests.map((tag) => (
                    <li key={tag} className="flex h-8 items-center rounded-md border border-line px-2.5 font-mono text-[12px]">
                      #{tag}
                    </li>
                  ))}
                </ul>
                <button className="mt-2 text-[13px] font-semibold hover:underline" onClick={() => setTab("tolken")}>
                  Tolken · {formatTolken(store.tolken)}
                </button>
              </section>
            )}
          </div>
          {own && (
            <section>
              <Label className="mb-2.5">Swaps and rings</Label>
              <ul className="divide-y divide-line border-y border-line">
                {cycles.map((c) => (
                  <li key={c.thread}>
                    <Link href={`/inbox?thread=${c.thread}`} className="flex items-center gap-3 py-2.5 hover:bg-sunken">
                      <span className="w-10 text-xs text-teal">{c.kind}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{c.text}</span>
                      <span className="text-[13px] font-semibold">Open</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="mt-8">
          <ContributionGraph handle={handle} />
        </div>

        <TabStrip className="mt-8" value={tab} onChange={setTab} tabs={tabs} />

        <div className="pt-5">
          {tab === "projects" && <TabGrid list={builds} empty={`${own ? "You haven't" : `${person.name} hasn't`} shipped anything yet.`} />}
          {tab === "ideas" && <TabGrid list={ideas} empty="No open ideas." cta={own} />}
          {tab === "starred" && <TabGrid list={starred} empty="Star projects to keep them here." showOwner />}
          {tab === "tolken" && (
            <section>
              <div className="flex items-baseline justify-between">
                <p className="text-[15px]">
                  Balance <span className="font-mono font-medium">{formatTolken(store.tolken)}</span>
                  <span className="ml-4 text-sm text-muted-ink">
                    Released <span className="font-mono font-medium text-ink">{formatTolken(earned)}</span>
                  </span>
                </p>
                <Label>Tolken · in-app currency</Label>
              </div>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {tolkenHistory.map((e) => (
                  <li key={e.title + e.detail} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{e.title}</p>
                      <p className="text-[13px] text-muted-ink">{e.detail}</p>
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        e.status === "Released" ? "text-teal" : "text-muted-ink",
                      )}
                    >
                      {e.status}
                    </span>
                    <span className="w-20 text-right font-mono text-sm">{formatTolken(e.amount_tolken)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] text-muted-ink">
                Bounties are funded and paid in Tolken. Nodal has no money, no checkout, and no payouts.
              </p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function TabGrid({
  list,
  empty,
  cta,
  showOwner = false,
}: {
  list: Parameters<typeof ProjectGrid>[0]["projects"];
  empty: string;
  cta?: boolean;
  showOwner?: boolean;
}) {
  if (list.length === 0)
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-12 text-center">
        <p className="text-sm text-muted-ink">{empty}</p>
        {cta && (
          <Link href="/create" className={btn.secondary}>
            Post an idea
          </Link>
        )}
      </div>
    );
  return <ProjectGrid projects={list} showOwner={showOwner} />;
}
