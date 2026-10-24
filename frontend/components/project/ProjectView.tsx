"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { AvatarStack } from "@/components/AvatarStack";
import { CollabButton } from "@/components/CollabDialog";
import { CoverArt } from "@/components/feed/CoverArt";
import { Label, ProjectMeta } from "@/components/Meta";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { fittersFor, me, people, type Project, viewerFits } from "@/lib/catalog";
import { formatTolken } from "@/lib/cover";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { FileTable } from "./FileTable";
import { LanguageBar } from "./LanguageBar";
import { Readme } from "./Readme";

export type ProjectTab = "code" | "readme" | "needs" | "discussion" | "activity";

export function ProjectView({ project, initialTab }: { project: Project; initialTab?: string }) {
  const store = useDemoStore();
  const hasCode = project.source !== "none" && !!project.files;
  const first: ProjectTab = hasCode ? "code" : "readme";
  const valid: ProjectTab[] = [first, "needs", "discussion", "activity"];
  const [tab, setTab] = useState<ProjectTab>(valid.includes(initialTab as ProjectTab) ? (initialTab as ProjectTab) : first);

  const owner = project.owner.handle === me.handle;
  const starred = store.starred.has(project.id);
  const following = store.following.has(project.owner.handle);
  const comments = [...project.comments, ...(store.comments[project.id] ?? [])];

  const tabs = [
    { id: first, label: hasCode ? "Code" : "Readme" },
    { id: "needs" as const, label: "Needs", count: project.needs.length },
    { id: "discussion" as const, label: "Discussion", count: comments.length },
    { id: "activity" as const, label: "Activity" },
  ];

  return (
    <>
      <MobileHeader title={project.title} />
      <div className="mx-auto max-w-[1060px] px-4 py-5 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-1 gap-4">
            <CoverArt cover={project.cover} seed={project.id} className="size-16 shrink-0 rounded-lg lg:size-[88px]" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] lg:text-[28px]">{project.title}</h1>
              <ProjectMeta project={project} className="mt-1.5" />
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-ink">
                <Avatar person={project.owner} size={20} />
                <Link href={`/u/${project.owner.handle}`} className="font-semibold text-ink hover:underline">
                  {project.owner.handle}
                </Link>
                <span>· updated {project.posted} ago</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0">
            <button
              aria-pressed={starred}
              onClick={() => store.toggle("starred", project.id)}
              className={btn.secondary}
            >
              <Star className={cn("size-4", starred && "fill-ink")} />
              {starred ? "Starred" : "Star"}
              <span className="border-l border-line pl-2 font-mono text-xs text-muted-ink">{project.stars + (starred ? 1 : 0)}</span>
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
                  aria-pressed={following}
                  onClick={() => store.toggle("following", project.owner.handle)}
                  className={following ? btn.done : btn.secondary}
                >
                  {following ? "Following" : `Follow ${project.owner.handle}`}
                </button>
                <CollabButton project={project} className="col-span-2 sm:col-span-1" />
              </>
            )}
          </div>
        </header>

        <TabStrip className="mt-6 overflow-x-auto [scrollbar-width:none] max-lg:[&>button]:flex-1 lg:mt-8" value={tab} onChange={setTab} tabs={tabs} />

        <div className="mt-6 flex flex-col gap-10 lg:flex-row">
          <div className="min-w-0 flex-1">
            {tab === "code" && project.files && (
              <div className="flex flex-col gap-5">
                <FileTable files={project.files} author={project.owner} />
                {project.readme && <ReadmePanel markdown={project.readme} />}
              </div>
            )}
            {tab === "readme" &&
              (project.readme ? (
                <ReadmePanel markdown={project.readme} />
              ) : (
                <p className="text-[15px] leading-relaxed">{project.summary}</p>
              ))}
            {tab === "needs" && <NeedsTab project={project} owner={owner} />}
            {tab === "discussion" && <Discussion project={project} comments={comments} />}
            {tab === "activity" && <Activity project={project} commentCount={comments.length} />}
          </div>
          <About project={project} />
        </div>
      </div>
    </>
  );
}

function ReadmePanel({ markdown }: { markdown: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <h2 className="border-b border-line bg-sunken px-4 py-2 font-mono text-[12px]">README.md</h2>
      <div className="px-5 py-2 lg:px-6">
        <Readme markdown={markdown} />
      </div>
    </section>
  );
}

function NeedsTab({ project, owner }: { project: Project; owner: boolean }) {
  const { funded, tolken, fund } = useDemoStore();
  if (project.needs.length === 0) {
    return <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted-ink">No open needs. This project has what it needs for now.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {project.needs.map((n) => {
        const fitters = fittersFor(project, n.skill);
        const fits = viewerFits(project, n);
        const key = `${project.id}:${n.skill}`;
        const isFunded = funded.has(key);
        return (
          <li key={n.skill} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", fits && "bg-teal-tint/50")}>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                {n.skill}
                {n.bounty_tolken && <span className="font-mono text-xs font-medium text-teal">{formatTolken(n.bounty_tolken)} bounty</span>}
                {fits && <span className="font-mono text-[11px] uppercase tracking-wider text-teal">You fit</span>}
              </p>
              <p className="text-sm text-muted-ink">{n.note}</p>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-ink">
                {fitters.length > 0 ? (
                  <>
                    <AvatarStack people={fitters} size={20} />
                    <span className="truncate">{fitters.map((f) => (f.handle === me.handle ? "you" : f.handle)).join(", ")} can fill this</span>
                  </>
                ) : (
                  <span>No one offers this yet</span>
                )}
              </div>
            </div>
            {owner ? (
              n.bounty_tolken ? (
                isFunded ? (
                  <span className={cn(btn.done, "w-full sm:w-auto")}>Funded · {formatTolken(n.bounty_tolken)}</span>
                ) : (
                  <button
                    onClick={() => {
                      if (tolken < n.bounty_tolken!) {
                        toast.error("Not enough Tolken", { description: `You have ${formatTolken(tolken)}.` });
                        return;
                      }
                      fund(project.id, n.skill, n.bounty_tolken!);
                      toast.success("Bounty funded in Tolken", { description: `${formatTolken(n.bounty_tolken!)} held for ${n.skill}` });
                    }}
                    className={cn(btn.secondary, "w-full sm:w-auto")}
                  >
                    Fund {formatTolken(n.bounty_tolken)}
                  </button>
                )
              ) : null
            ) : (
              <CollabButton project={project} skill={n.skill} label="Offer" className="w-full sm:w-auto" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Discussion({ project, comments }: { project: Project; comments: Project["comments"] }) {
  const { addComment } = useDemoStore();
  const [body, setBody] = useState("");
  function post() {
    const text = body.trim();
    if (!text) return;
    addComment(project.id, { author: me, age: "now", body: text });
    setBody("");
  }
  return (
    <div className="flex flex-col gap-5">
      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted-ink">No comments yet. Ask a question or say how you&apos;d help.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {comments.map((c, i) => (
            <li key={i} className="flex gap-3 py-4 first:pt-0">
              <Link href={`/u/${c.author.handle}`}>
                <Avatar person={c.author} size={32} />
              </Link>
              <div className="min-w-0 text-[15px]">
                <p className="flex items-baseline gap-2">
                  <span className="font-semibold">{c.author.handle}</span>
                  <span className="font-mono text-[11px] text-muted-ink">{c.age}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-3 border-t border-line pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          post();
        }}
      >
        <Avatar person={me} size={32} />
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
          <button type="submit" disabled={!body.trim()} className={cn(btn.primary, "self-end")}>
            Comment
          </button>
        </div>
      </form>
    </div>
  );
}

function Activity({ project, commentCount }: { project: Project; commentCount: number }) {
  const items = [
    { who: project.owner, what: project.activity, age: project.posted },
    ...project.comments.map((c) => ({ who: c.author, what: "commented", age: c.age })),
    ...project.memberHandles
      .filter((h) => h !== project.owner.handle)
      .map((h) => ({ who: people[h], what: "joined the team", age: "earlier" })),
  ];
  return (
    <div>
      <Label className="mb-3">
        {items.length} events · {commentCount} comments
      </Label>
      <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
        {items.map((a, i) => (
          <li key={i} className="relative flex items-center gap-3 text-[15px]">
            <span className="absolute -left-[25px] size-2 rounded-full border-2 border-white bg-muted-ink" aria-hidden />
            <Avatar person={a.who} size={24} />
            <p className="min-w-0 flex-1">
              <span className="font-semibold">{a.who.handle}</span> {a.what}
            </p>
            <span className="font-mono text-[11px] text-muted-ink">{a.age}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function About({ project }: { project: Project }) {
  const team = project.memberHandles.map((h) => people[h]);
  const facts = [
    [project.stars, "stars"],
    [team.length, team.length === 1 ? "member" : "members"],
    ...(project.license ? [[project.license, "license"]] : []),
  ];
  return (
    <aside className="flex w-full shrink-0 flex-col gap-7 border-t border-line pt-6 lg:w-[260px] lg:border-t-0 lg:pt-0">
      <section>
        <Label className="mb-2">About</Label>
        <p className="text-sm leading-relaxed">{project.summary}</p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {project.tags.map((t) => (
            <Link key={t} href={`/explore?q=${encodeURIComponent(t)}`} className="font-mono text-[12px] text-muted-ink hover:text-ink hover:underline">
              #{t}
            </Link>
          ))}
        </p>
        <dl className="mt-4 flex flex-col gap-1 font-mono text-[12px]">
          {facts.map(([v, k]) => (
            <div key={String(k)} className="flex justify-between border-b border-dashed border-line pb-1">
              <dt className="uppercase tracking-wider text-muted-ink">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      {project.languages && (
        <section>
          <Label className="mb-2">Languages</Label>
          <LanguageBar languages={project.languages} />
        </section>
      )}
      <section>
        <Label className="mb-2">Team</Label>
        <ul className="flex flex-col gap-2">
          {team.map((p) => (
            <li key={p.handle}>
              <Link href={`/u/${p.handle}`} className="flex items-center gap-2.5 text-sm hover:underline">
                <Avatar person={p} size={28} />
                <span className="font-semibold">{p.handle}</span>
                {p.handle === project.owner.handle && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-ink">owner</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
