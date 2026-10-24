"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/project/states";
import { api } from "@/lib/api";
import type { ProjectCard, ProjectList } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ProjectGrid, ProjectGridSkeleton } from "./ProjectTile";

// Server-side filters map to GET /projects params; "Needs you" filters the loaded cards by needs.viewer_fits.
const filters: { id: string; label: string; params?: Record<string, string>; signedInOnly?: boolean }[] = [
  { id: "all", label: "All" },
  { id: "you", label: "Needs you", signedInOnly: true },
  { id: "ideas", label: "Ideas", params: { stage: "idea" } },
  { id: "software", label: "Software", params: { type: "software" } },
  { id: "hardware", label: "Hardware", params: { type: "hardware" } },
  { id: "creative", label: "Creative", params: { type: "creative" } },
  { id: "open", label: "Open source", params: { source: "open" } },
];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function ExploreGrid() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { signedIn } = useSession();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState("all");
  const query = useDebounced(q.trim(), 250);

  const f = filters.find((x) => x.id === filter)!;
  const search = new URLSearchParams({ ...(f.params ?? {}), ...(query ? { q: query } : {}), page: "1" });
  const path = `/projects?${search}`;
  const { data, error, loading, reload } = useApi<ProjectList>(path);

  const [more, setMore] = useState<{ path: string; items: ProjectCard[]; next: number | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const extra = more?.path === path ? more : null;
  const next = extra ? extra.next : data?.next_page ?? null;

  // Keep ?q= in the URL so search results can be shared and survive a reload.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (current === query) return;
    const sp = new URLSearchParams(params.toString());
    if (query) sp.set("q", query);
    else sp.delete("q");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }, [query, params, pathname, router]);

  async function loadMore() {
    if (!next) return;
    setLoadingMore(true);
    try {
      const sp = new URLSearchParams(search);
      sp.set("page", String(next));
      const page = await api<ProjectList>(`/projects?${sp}`);
      setMore({ path, items: [...(extra?.items ?? []), ...page.items], next: page.next_page });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  const all = [...(data?.items ?? []), ...(extra?.items ?? [])];
  const shown = filter === "you" ? all.filter((p) => p.needs.some((n) => n.status === "open" && n.viewer_fits)) : all;
  const filtered = filter !== "all" || query !== "";
  const clear = () => {
    setQ("");
    setFilter("all");
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block lg:max-w-[520px]">
        <span className="sr-only">Search projects, people, skills</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-ink" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects, people, skills"
          className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-10 text-[15px] outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-ink hover:bg-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filters">
        {filters
          .filter((x) => !x.signedInOnly || signedIn)
          .map((x) => {
            const on = filter === x.id;
            return (
              <button
                key={x.id}
                aria-pressed={on}
                onClick={() => setFilter(x.id)}
                className={cn(
                  "h-9 shrink-0 rounded-md border px-3 text-[13px] font-medium transition-colors",
                  on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink",
                  x.id === "you" && !on && "text-teal",
                )}
              >
                {x.label}
              </button>
            );
          })}
      </div>

      {loading && !data ? (
        <ProjectGridSkeleton />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <>
          <p className="flex items-center gap-2 text-xs text-muted-ink" aria-live="polite">
            {shown.length} {shown.length === 1 ? "project" : "projects"}
            {next && filter !== "you" && " shown"}
            {query && <> matching “{query}”</>}
            {loading && <Loader2 className="size-3 animate-spin" aria-label="Updating" />}
          </p>
          {shown.length === 0 ? (
            <EmptyState
              action={
                filtered ? (
                  <button className={btn.secondary} onClick={clear}>
                    Clear filters
                  </button>
                ) : undefined
              }
            >
              {filter === "you"
                ? "Nothing here needs your skills yet. Add more skills to your profile, or look at ideas."
                : "No projects match. Try a skill like PCB design, or clear the filters."}
            </EmptyState>
          ) : (
            <ProjectGrid projects={shown} />
          )}
          {next && (
            <div className="flex justify-center py-4">
              <button className={btn.secondary} onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="size-4 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
