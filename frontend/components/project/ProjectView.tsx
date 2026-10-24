"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { CollabButton } from "@/components/CollabDialog";
import { CoverArt } from "@/components/feed/CoverArt";
import { Label, ProjectMeta } from "@/components/Meta";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { CommentOut, NeedOut, ProjectDetail, TolkenOut } from "@/lib/api-types";
import { formatTolken } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { Readme } from "./Readme";
import { SourceBrowser } from "./SourceBrowser";
import { EmptyState, ErrorState, SignInPrompt, timeAgo } from "./states";

export type ProjectTab = "code" | "readme" | "needs" | "discussion" | "activity";

/** Only http(s) links render; anything else (javascript:, data:) is dropped. */
function safeUrl(u: string | null) {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Wraps an action that needs a signed-in viewer: signed out, it points to sign-in instead. */
function useRequireSignIn() {
  const { signedIn } = useSession();
  const router = useRouter();
  return (what: string, run: () => void) => {
    if (signedIn) return run();
    toast(`Sign in to ${what}`, { action: { label: "Sign in", onClick: () => router.push("/") } });
  };
}

export function ProjectView({ id, initialTab }: { id: string; initialTab?: string }) {
  const project = useApi<ProjectDetail>(`/projects/${id}`);

  if (project.error) {
    const notFound = project.error instanceof ApiError && project.error.status === 404;
    return (
      <>
        <MobileHeader title="Project" />
        <div className="mx-auto max-w-[1060px] px-4 py-10 lg:px-8">
          {notFound ? (
            <EmptyState
              action={
                <Link href="/explore" className={btn.secondary}>
                  Browse projects
                </Link>
              }
            >
              This project doesn&apos;t exist or was deleted.
            </EmptyState>
          ) : (
            <ErrorState message={project.error.message} onRetry={project.reload} />
          )}
        </div>
      </>
    );
  }
  if (!project.data) return <ProjectSkeleton />;
  return <Loaded project={project.data} mutate={project.mutate} initialTab={initialTab} />;
}

function ProjectSkeleton() {
  return (
    <div className="mx-auto max-w-[1060px] px-4 py-5 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading project">
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-lg lg:size-[88px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mt-8 h-10 w-full" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

function Loaded({
  project,
  mutate,
  initialTab,
}: {
  project: ProjectDetail;
  mutate: (fn: (p: ProjectDetail | undefined) => ProjectDetail) => void;
  initialTab?: string;
}) {
  const { me } = useSession();
  const requireSignIn = useRequireSignIn();
  const hasCode = project.has_source;
  const first: ProjectTab = hasCode ? "code" : "readme";
  const valid: ProjectTab[] = [first, "needs", "discussion", "activity"];
  const [tab, setTab] = useState<ProjectTab>(valid.includes(initialTab as ProjectTab) ? (initialTab as ProjectTab) : first);
  const [busy, setBusy] = useState<"star" | "follow" | null>(null);

  const owner = me?.profile.id === project.owner.id;

  function toggleStar() {
    requireSignIn("star projects", async () => {
      const was = project.viewer_starred;
      mutate((p) => ({ ...p!, viewer_starred: !was, star_count: p!.star_count + (was ? -1 : 1) }));
      setBusy("star");
      try {
        const res = await api<{ starred: boolean; count: number }>(`/projects/${project.id}/star`, { method: was ? "DELETE" : "POST" });
        mutate((p) => ({ ...p!, viewer_starred: res.starred, star_count: res.count }));
        invalidate("/feed", "/projects?", "/profiles/");
      } catch (e) {
        mutate((p) => ({ ...p!, viewer_starred: was, star_count: p!.star_count + (was ? 1 : -1) }));
        toast.error((e as Error).message);
      } finally {
        setBusy(null);
      }
    });
  }

  function toggleFollow() {
    requireSignIn(`follow ${project.owner.handle}`, async () => {
      const was = project.viewer_follows_owner;
      mutate((p) => ({ ...p!, viewer_follows_owner: !was }));
      setBusy("follow");
      try {
        await api(`/profiles/${project.owner.id}/follow`, { method: was ? "DELETE" : "POST" });
        invalidate("/feed", `/profiles/${project.owner.handle}`);
      } catch (e) {
        mutate((p) => ({ ...p!, viewer_follows_owner: was }));
        toast.error((e as Error).message);
      } finally {
        setBusy(null);
      }
    });
  }

  const tabs = [
    { id: first, label: hasCode ? "Code" : "Readme" },
    { id: "needs" as const, label: "Needs", count: project.needs.filter((n) => n.status === "open").length },
    { id: "discussion" as const, label: "Discussion", count: project.comment_count },
    { id: "activity" as const, label: "Activity" },
  ];

  return (
    <>
      <MobileHeader title={project.title} />
      <div className="mx-auto max-w-[1060px] px-4 py-5 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-1 gap-4">
            <CoverArt cover={project.cover} seed={project.id} className="size-16 shrink-0 rounded-lg lg:size-[88px]" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] lg:text-[28px]">{project.title}</h1>
              <ProjectMeta project={project} className="mt-1.5" />
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-ink">
                <Avatar person={project.owner} size={20} />
                <Link href={`/u/${project.owner.handle}`} className="font-semibold text-ink hover:underline">
                  {project.owner.display_name ?? project.owner.handle}
                </Link>
                <span>posted {timeAgo(project.created_at)}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0">
            <button aria-pressed={project.viewer_starred} onClick={toggleStar} disabled={busy === "star"} className={btn.secondary}>
              <Star className={cn("size-4", project.viewer_starred && "fill-ink")} />
              {project.viewer_starred ? "Starred" : "Star"}
              <span className="border-l border-line pl-2 text-xs text-muted-ink">{project.star_count}</span>
            </button>
            {owner ? (
              <>
                <Link href={`/projects/${project.id}/results`} className={btn.secondary}>
                  {project.stage === "idea" ? "View checks" : "People who fit"}
                </Link>
                <Link href={`/projects/${project.id}/team`} className={btn.primary}>
                  Team
                </Link>
              </>
            ) : (
              <>
                <button
                  aria-pressed={project.viewer_follows_owner}
                  onClick={toggleFollow}
                  disabled={busy === "follow"}
                  className={project.viewer_follows_owner ? btn.done : btn.secondary}
                >
                  {project.viewer_follows_owner ? "Following" : `Follow ${project.owner.handle}`}
                </button>
                <CollabButton project={project} className="col-span-2 sm:col-span-1" />
              </>
            )}
          </div>
        </header>

        <TabStrip className="mt-6 max-lg:[&>button]:flex-1 lg:mt-8" value={tab} onChange={setTab} tabs={tabs} />

        <div className="mt-6 flex flex-col gap-10 lg:flex-row">
          <div className="min-w-0 flex-1">
            {tab === "code" && (
              <div className="flex flex-col gap-5">
                <SourceBrowser projectId={project.id} />
                {project.readme_md && <ReadmePanel markdown={project.readme_md} />}
              </div>
            )}
            {tab === "readme" &&
              (project.readme_md ? (
                <ReadmePanel markdown={project.readme_md} />
              ) : (
                <p className="text-[15px] leading-relaxed">{project.summary}</p>
              ))}
            {tab === "needs" && <NeedsTab project={project} owner={owner} />}
            {tab === "discussion" && (
              <Discussion projectId={project.id} onCount={(n) => mutate((p) => ({ ...p!, comment_count: n }))} />
            )}
            {tab === "activity" && <Activity project={project} />}
          </div>
          <About project={project} />
        </div>
      </div>
    </>
  );
}

function ReadmePanel({ markdown }: { markdown: string }) {
  return (
    <section className="focus-inset overflow-hidden rounded-xl border border-line">
      <h2 className="border-b border-line bg-sunken px-4 py-2 font-mono text-[12px]">README.md</h2>
      <div className="px-5 py-2 lg:px-6">
        <Readme markdown={markdown} />
      </div>
    </section>
  );
}

function Fitters({ need }: { need: NeedOut }) {
  if (need.fitters.length === 0) return <span>No one offers this yet</span>;
  const names = need.fitters.map((f) => f.handle);
  return (
    <>
      <span className="flex items-center">
        {need.fitters.slice(0, 3).map((f, i) => (
          <Link key={f.id} href={`/u/${f.handle}`} className={cn("rounded-full border-2 border-white", i > 0 && "-ml-1.5")}>
            <Avatar person={f} size={20} />
          </Link>
        ))}
      </span>
      <span className="truncate">
        {names.slice(0, 3).join(", ")}
        {names.length > 3 && ` and ${names.length - 3} more`} can fill this
      </span>
    </>
  );
}

function NeedsTab({ project, owner }: { project: ProjectDetail; owner: boolean }) {
  // The owner's ledger says which bounties are already funded.
  const ledger = useApi<TolkenOut>(owner ? "/me/tolken" : null);
  const [funding, setFunding] = useState<string | null>(null);

  async function fund(need: NeedOut) {
    setFunding(need.id);
    try {
      await api(`/projects/${project.id}/needs/${need.id}/fund`, { method: "POST" });
      toast.success("Bounty funded", { description: `${formatTolken(need.bounty_tolken!)} held for ${need.skill.name}` });
      invalidate("/me/tolken", "/me");
      ledger.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFunding(null);
    }
  }

  if (project.needs.length === 0) {
    return (
      <EmptyState
        action={
          owner ? (
            <Link href="/create" className={btn.secondary}>
              Post another idea
            </Link>
          ) : undefined
        }
      >
        No open needs. This project has what it needs for now.
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {project.needs.map((n) => {
        const entry = ledger.data?.ledger.find((e) => e.need_id === n.id && ["funded", "released"].includes(e.status));
        return (
          <li key={n.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", n.viewer_fits && "bg-teal-tint/50")}>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                {n.skill.name}
                {n.bounty_tolken && <span className="text-xs font-medium text-teal">{formatTolken(n.bounty_tolken)} bounty</span>}
                {n.status === "filled" && <span className="text-xs font-medium text-muted-ink">Filled</span>}
                {n.viewer_fits && n.status === "open" && <span className="text-xs text-teal">You fit</span>}
              </p>
              {n.note && <p className="text-sm text-muted-ink">{n.note}</p>}
              <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-ink">
                <Fitters need={n} />
              </div>
            </div>
            {owner ? (
              n.bounty_tolken ? (
                entry ? (
                  <span className={cn(btn.done, "w-full sm:w-auto")}>
                    {entry.status === "released" ? "Paid" : "Funded"} {formatTolken(n.bounty_tolken)}
                  </span>
                ) : (
                  <button onClick={() => fund(n)} disabled={funding === n.id} className={cn(btn.secondary, "w-full sm:w-auto")}>
                    {funding === n.id && <Loader2 className="size-4 animate-spin" />}
                    Fund {formatTolken(n.bounty_tolken)}
                  </button>
                )
              ) : null
            ) : n.status === "open" ? (
              <CollabButton project={project} skillId={n.skill.id} label="Offer" className="w-full sm:w-auto" />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Discussion({ projectId, onCount }: { projectId: string; onCount: (n: number) => void }) {
  const { me, signedIn } = useSession();
  const comments = useApi<CommentOut[]>(`/projects/${projectId}/comments`);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function post() {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const created = await api<CommentOut>(`/projects/${projectId}/comments`, { method: "POST", body: { body: text } });
      const next = [...(comments.data ?? []), created];
      comments.mutate(next);
      onCount(next.length);
      setBody("");
      invalidate("/feed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {comments.error ? (
        <ErrorState message={comments.error.message} onRetry={comments.reload} />
      ) : !comments.data ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.data.length === 0 ? (
        <EmptyState>No comments yet. Ask a question or say how you&apos;d help.</EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {comments.data.map((c) => (
            <li key={c.id} className="flex gap-3 py-4 first:pt-0">
              <Link href={`/u/${c.author.handle}`}>
                <Avatar person={c.author} size={32} />
              </Link>
              <div className="min-w-0 text-[15px]">
                <p className="flex items-baseline gap-2">
                  <Link href={`/u/${c.author.handle}`} className="font-semibold hover:underline">
                    {c.author.handle}
                  </Link>
                  <span className="text-xs text-muted-ink">{timeAgo(c.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {signedIn && me ? (
        <form
          className="flex gap-3 border-t border-line pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            post();
          }}
        >
          <Avatar person={me.profile} size={32} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="comment" className="sr-only">
              Comment
            </label>
            <textarea
              id="comment"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
              }}
              rows={2}
              maxLength={2000}
              placeholder="Add to the discussion"
              className="resize-none rounded-lg border border-line px-3 py-2.5 text-[15px] outline-none placeholder:text-muted-ink focus:border-ink"
            />
            <button type="submit" disabled={!body.trim() || posting} className={cn(btn.primary, "self-end")}>
              {posting && <Loader2 className="size-4 animate-spin" />}
              Comment
            </button>
          </div>
        </form>
      ) : (
        <SignInPrompt>Sign in to join the discussion.</SignInPrompt>
      )}
    </div>
  );
}

function Activity({ project }: { project: ProjectDetail }) {
  const comments = useApi<CommentOut[]>(`/projects/${project.id}/comments`);
  const items = [
    { key: "created", who: project.owner, what: project.stage === "idea" ? "posted this idea" : "posted this project", at: project.created_at },
    ...(comments.data ?? []).map((c) => ({ key: c.id, who: c.author, what: "commented", at: c.created_at })),
    ...project.members
      .filter((m) => m.role === "contributor" && m.status === "joined")
      .map((m) => ({ key: `m:${m.profile.id}`, who: m.profile, what: m.skill ? `joined for ${m.skill.name}` : "joined the team", at: "" })),
  ].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  return (
    <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
      {items.map((a) => (
        <li key={a.key} className="relative flex items-center gap-3 text-[15px]">
          <span className="absolute -left-[25px] size-2 rounded-full border-2 border-white bg-muted-ink" aria-hidden />
          <Avatar person={a.who} size={24} />
          <p className="min-w-0 flex-1">
            <Link href={`/u/${a.who.handle}`} className="font-semibold hover:underline">
              {a.who.handle}
            </Link>{" "}
            {a.what}
          </p>
          {a.at && <span className="text-xs text-muted-ink">{timeAgo(a.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

function About({ project }: { project: ProjectDetail }) {
  const team = project.members.filter((m) => m.status === "joined");
  const repo = safeUrl(project.repo_url);
  const demo = safeUrl(project.demo_url);
  const facts: [string | number, string][] = [
    [project.star_count, project.star_count === 1 ? "star" : "stars"],
    [team.length, team.length === 1 ? "member" : "members"],
    [project.people_fit, project.people_fit === 1 ? "person fits" : "people fit"],
  ];
  return (
    <aside className="flex w-full shrink-0 flex-col gap-7 border-t border-line pt-6 lg:w-[260px] lg:border-t-0 lg:pt-0">
      <section>
        <Label className="mb-2">About</Label>
        <p className="text-sm leading-relaxed">{project.summary}</p>
        {project.tags.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {project.tags.map((t) => (
              <Link key={t} href={`/explore?q=${encodeURIComponent(t)}`} className="text-[13px] text-muted-ink hover:text-ink hover:underline">
                #{t}
              </Link>
            ))}
          </p>
        )}
        <dl className="mt-4 flex flex-col gap-1 text-[13px]">
          {facts.map(([v, k]) => (
            <div key={k} className="flex justify-between border-b border-dashed border-line pb-1">
              <dt className="text-muted-ink">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {(repo || demo) && (
          <p className="mt-3 flex flex-col gap-1 text-[13px]">
            {repo && (
              <a href={repo} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                Repository
              </a>
            )}
            {demo && (
              <a href={demo} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                Live demo
              </a>
            )}
          </p>
        )}
      </section>
      <section>
        <Label className="mb-2">Team</Label>
        <ul className="flex flex-col gap-2">
          {team.map((m) => (
            <li key={m.profile.id}>
              <Link href={`/u/${m.profile.handle}`} className="flex items-center gap-2.5 text-sm hover:underline">
                <Avatar person={m.profile} size={28} />
                <span className="font-semibold">{m.profile.handle}</span>
                <span className="text-xs text-muted-ink">{m.role === "owner" ? "owner" : m.skill?.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
