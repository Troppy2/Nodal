"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, SignInPrompt } from "@/components/project/states";
import { TabStrip } from "@/components/Tabs";
import { api } from "@/lib/api";
import type { FeedResponse, ProjectCard } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { PostCard, PostCardSkeleton } from "./PostCard";

type Tab = "for_you" | "following" | "ideas";

const empty: Record<Tab, { text: string; action: React.ReactNode }> = {
  for_you: {
    text: "Nothing to show yet. Post an idea and it becomes the first thing here.",
    action: (
      <Link href="/create" className={btn.primary}>
        Post an idea
      </Link>
    ),
  },
  following: {
    text: "Follow people or star projects and their updates show up here.",
    action: (
      <Link href="/explore" className={btn.secondary}>
        Find projects
      </Link>
    ),
  },
  ideas: {
    text: "No open ideas right now. Post one and people with the skills you need will see it.",
    action: (
      <Link href="/create" className={btn.primary}>
        Post an idea
      </Link>
    ),
  },
};

function FeedList({ tab }: { tab: Tab }) {
  const { data, error, loading, reload } = useApi<FeedResponse>(`/feed?tab=${tab}`);
  const [more, setMore] = useState<ProjectCard[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const next = cursor === undefined ? data?.next_cursor : cursor;

  async function loadMore() {
    if (!next) return;
    setLoadingMore(true);
    try {
      const page = await api<FeedResponse>(`/feed?tab=${tab}&cursor=${encodeURIComponent(next)}`);
      setMore((m) => [...m, ...page.items.filter((p) => !m.some((x) => x.id === p.id))]);
      setCursor(page.next_cursor);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col lg:gap-5 lg:pt-5">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }
  if (error && !data) return <ErrorState className="m-4 lg:mx-0" message={error.message} onRetry={reload} />;

  const items = [...(data?.items ?? []), ...more.filter((p) => !data?.items.some((x) => x.id === p.id))];
  if (items.length === 0) {
    return (
      <EmptyState className="m-4 lg:mx-0" action={empty[tab].action}>
        {empty[tab].text}
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col lg:gap-5 lg:pt-5">
      {items.map((p) => (
        <PostCard key={p.id} project={p} />
      ))}
      {next && (
        <div className="flex justify-center py-6">
          <button className={btn.secondary} onClick={loadMore} disabled={loadingMore}>
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

export function FeedTabs() {
  const [tab, setTab] = useState<Tab>("for_you");
  const { ready, signedIn } = useSession();

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
      {tab === "following" && ready && !signedIn ? (
        <div className="p-4 lg:px-0">
          <SignInPrompt>Sign in to see projects from people you follow.</SignInPrompt>
        </div>
      ) : (
        <FeedList key={`${tab}-${signedIn}`} tab={tab} />
      )}
    </section>
  );
}
