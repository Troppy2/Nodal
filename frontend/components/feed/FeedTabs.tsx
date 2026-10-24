"use client";

import Link from "next/link";
import { useState } from "react";
import { TabStrip } from "@/components/Tabs";
import { feedIds, getProject, projects, type Project } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { PostCard } from "./PostCard";

type Tab = "for_you" | "following" | "ideas";

export function FeedTabs() {
  const [tab, setTab] = useState<Tab>("for_you");
  const { following, starred } = useDemoStore();

  const shown: Project[] =
    tab === "ideas"
      ? projects.filter((p) => p.stage === "idea")
      : tab === "following"
        ? projects.filter((p) => following.has(p.owner.handle) || starred.has(p.id))
        : feedIds.map((id) => getProject(id)!);

  return (
    <section>
      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "for_you", label: "For you" },
          { id: "following", label: "Following" },
          { id: "ideas", label: "Ideas" },
        ]}
        className="px-4 max-lg:[&>button]:flex-1 lg:gap-7 lg:px-0"
      />
      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="font-semibold">Nothing here yet</p>
          <p className="max-w-xs text-sm text-muted-ink">Follow people or star projects and their updates show up here.</p>
          <Link href="/explore" className={btn.secondary}>
            Find projects
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:gap-5 lg:pt-5">
          {shown.map((p) => (
            <PostCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}
