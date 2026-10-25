"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Award, Check, Loader2, Pencil, Plus, Rocket, Share2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { CollabButton } from "@/components/CollabDialog";
import { CoverArt } from "@/components/feed/CoverArt";
import { SkillPicker } from "@/components/forms/SkillPicker";
import { Label, ProjectMeta } from "@/components/Meta";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { CollabOut, CommentOut, NeedOut, ProjectDetail, ProjectPatch, Skill, Stage, TolkenOut } from "@/lib/api-types";
import { formatTolken, TOLKEN } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { Readme } from "./Readme";
import { SourceBrowser } from "./SourceBrowser";
import { EmptyState, ErrorState, SignInPrompt, timeAgo } from "./states";

export type ProjectTab = "code" | "readme" | "needs" | "discussion" | "activity";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink";

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
  return <Loaded project={project.data} mutate={project.mutate} reload={project.reload} initialTab={initialTab} />;
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
  reload,
  initialTab,
}: {
  project: ProjectDetail;
  mutate: (fn: (p: ProjectDetail | undefined) => ProjectDetail) => void;
  reload: () => void;
  initialTab?: string;
}) {
  const { me } = useSession();
  const router = useRouter();
  const requireSignIn = useRequireSignIn();
  const hasCode = project.has_source;
  const first: ProjectTab = hasCode ? "code" : "readme";
  const valid: ProjectTab[] = [first, "needs", "discussion", "activity"];
  const [tab, setTab] = useState<ProjectTab>(valid.includes(initialTab as ProjectTab) ? (initialTab as ProjectTab) : first);
  const [busy, setBusy] = useState<"star" | "follow" | "deleting" | "shipping" | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  async function deleteProject() {
    setBusy("deleting");
    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      toast.success(project.stage === "idea" ? "Idea deleted" : "Project deleted");
      invalidate("/feed", "/projects", "/profiles/");
      router.push("/explore");
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  async function markAsShipped() {
    setBusy("shipping");
    try {
      const updated = await api<ProjectDetail>(`/projects/${project.id}`, {
        method: "PATCH",
        body: { stage: "shipped" },
      });
      mutate(() => updated);
      toast.success("Congratulations! Project marked as Shipped! 🎉");
      invalidate("/feed", "/projects", "/profiles/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
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
            <CoverArt cover={project.cover} seed={project.id} coverUrl={project.cover_url} className="size-16 shrink-0 rounded-lg lg:size-[88px]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] lg:text-[28px]">{project.title}</h1>
                {project.stage === "shipped" && (
                  <span className="rounded-full bg-teal px-2.5 py-0.5 text-xs font-bold text-white">Shipped</span>
                )}
              </div>
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
                {project.stage === "building" && (
                  <button onClick={markAsShipped} disabled={busy === "shipping"} className={btn.match} title="Mark project as shipped">
                    <Rocket className="size-4" />
                    Ship
                  </button>
                )}
                <button onClick={() => setEditing(true)} className={btn.secondary} title="Edit project details">
                  <Pencil className="size-4" />
                  Edit
                </button>
                <button onClick={() => setConfirmDelete(true)} className={cn(btn.ghost, "text-cool hover:bg-cool/10")} title="Delete project">
                  <Trash2 className="size-4" />
                </button>
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
            {tab === "needs" && <NeedsTab project={project} owner={owner} onReload={reload} />}
            {tab === "discussion" && (
              <Discussion projectId={project.id} ownerId={project.owner.id} onCount={(n) => mutate((p) => ({ ...p!, comment_count: n }))} />
            )}
            {tab === "activity" && <Activity project={project} />}
          </div>
          <About project={project} />
        </div>
      </div>

      {editing && (
        <EditProjectDialog
          project={project}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            mutate(() => updated);
            setEditing(false);
          }}
        />
      )}

      {confirmDelete && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Delete {project.stage === "idea" ? "idea" : "project"}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{project.title}&rdquo;? All needs, comments, and members will be permanently removed.
              Any funded bounties will be returned to your Tolken balance.
            </DialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className={btn.secondary}>
                Cancel
              </button>
              <button type="button" onClick={deleteProject} disabled={busy === "deleting"} className={cn(btn.primary, "bg-cool hover:bg-cool/90")}>
                {busy === "deleting" && <Loader2 className="size-4 animate-spin" />}
                Delete permanently
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function EditProjectDialog({
  project,
  open,
  onClose,
  onSaved,
}: {
  project: ProjectDetail;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: ProjectDetail) => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [summary, setSummary] = useState(project.summary);
  const [stage, setStage] = useState<Stage>(project.stage);
  const [coverUrl, setCoverUrl] = useState(project.cover_url ?? "");
  const [readme, setReadme] = useState(project.readme_md ?? "");
  const [repoUrl, setRepoUrl] = useState(project.repo_url ?? "");
  const [demoUrl, setDemoUrl] = useState(project.demo_url ?? "");
  const [tagsStr, setTagsStr] = useState(project.tags.join(", "));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || saving) return;
    setSaving(true);
    const tags = tagsStr
      .split(/[,]+/)
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);

    try {
      const patch: ProjectPatch = {
        title: title.trim(),
        summary: summary.trim(),
        stage,
        cover_url: coverUrl.trim() || null,
        readme_md: readme.trim() || null,
        repo_url: repoUrl.trim() || null,
        demo_url: demoUrl.trim() || null,
        tags,
      };
      const updated = await api<ProjectDetail>(`/projects/${project.id}`, { method: "PATCH", body: patch });
      toast.success("Project updated");
      invalidate("/feed", "/projects", `/projects/${project.id}`);
      onSaved(updated);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>Edit {project.stage === "idea" ? "Idea" : "Project"}</DialogTitle>
        <DialogDescription>Update details, stage, links, and cover picture.</DialogDescription>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="edit-title" className="mb-1 block text-xs font-semibold">
              Title
            </label>
            <input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(inputClass, "h-10")}
              required
              maxLength={120}
            />
          </div>

          <div>
            <label htmlFor="edit-stage" className="mb-1 block text-xs font-semibold">
              Stage
            </label>
            <div className="flex gap-2">
              {(["idea", "building", "shipped"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={cn(
                    "flex-1 rounded-md border py-2 text-xs font-semibold capitalize transition-colors",
                    stage === s ? "border-ink bg-ink text-white" : "border-line text-muted-ink hover:text-ink",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="edit-summary" className="mb-1 block text-xs font-semibold">
              Caption / Summary
            </label>
            <textarea
              id="edit-summary"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={cn(inputClass, "py-2")}
              required
              maxLength={600}
            />
          </div>

          <div>
            <label htmlFor="edit-cover" className="mb-1 block text-xs font-semibold">
              Cover Image URL <span className="font-normal text-muted-ink">(optional)</span>
            </label>
            <input
              id="edit-cover"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className={cn(inputClass, "h-10")}
            />
            {coverUrl.trim() && (
              <div className="mt-2 h-24 overflow-hidden rounded-md border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="Cover preview" className="size-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="edit-readme" className="mb-1 block text-xs font-semibold">
              README.md <span className="font-normal text-muted-ink">(markdown)</span>
            </label>
            <textarea
              id="edit-readme"
              rows={5}
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
              className={cn(inputClass, "font-mono py-2 text-xs")}
              placeholder="## What this project is about..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-repo" className="mb-1 block text-xs font-semibold">
                Repository URL
              </label>
              <input
                id="edit-repo"
                type="url"
                placeholder="https://github.com/..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className={cn(inputClass, "h-10 text-xs")}
              />
            </div>
            <div>
              <label htmlFor="edit-demo" className="mb-1 block text-xs font-semibold">
                Live Demo URL
              </label>
              <input
                id="edit-demo"
                type="url"
                placeholder="https://..."
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className={cn(inputClass, "h-10 text-xs")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-tags" className="mb-1 block text-xs font-semibold">
              Tags <span className="font-normal text-muted-ink">(comma separated)</span>
            </label>
            <input
              id="edit-tags"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="react, typescript, hardware"
              className={cn(inputClass, "h-10 text-xs")}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim() || !summary.trim()} className={btn.primary}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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

function NeedsTab({ project, owner, onReload }: { project: ProjectDetail; owner: boolean; onReload: () => void }) {
  const { me } = useSession();
  const searchParams = useSearchParams();
  const highlightedBountyId = searchParams.get("bounty");
  const ledger = useApi<TolkenOut>(owner ? "/me/tolken" : null);
  const collabReqs = useApi<CollabOut[]>(owner ? `/projects/${project.id}/collab-requests` : null);
  const [funding, setFunding] = useState<string | null>(null);
  const [addingNeed, setAddingNeed] = useState(false);
  const [editingNeed, setEditingNeed] = useState<NeedOut | null>(null);
  const [busyNeed, setBusyNeed] = useState<string | null>(null);
  const [actingWork, setActingWork] = useState<string | null>(null);

  const pendingRequests = collabReqs.data?.filter((r) => r.status === "pending") ?? [];
  const onTeam = Boolean(me && project.members.some((m) => m.profile.id === me.profile.id));

  async function respondRequest(requestId: string, status: "accepted" | "declined") {
    try {
      await api(`/collab-requests/${requestId}/respond`, { method: "POST", body: { status } });
      toast.success(status === "accepted" ? "Contributor accepted to team!" : "Request declined");
      collabReqs.reload();
      invalidate(`/projects/${project.id}`);
      onReload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submitWork(need: NeedOut) {
    setActingWork(need.id);
    try {
      await api(`/projects/${project.id}/needs/${need.id}/submit-work`, { method: "POST" });
      toast.success("Work submitted for review! Owner notified.");
      invalidate(`/projects/${project.id}`);
      onReload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActingWork(null);
    }
  }

  async function confirmWork(need: NeedOut) {
    if (!confirm(`Confirm work completed for ${need.skill.name}? This will mark the task finished and release any funded Tolken bounty.`)) return;
    setActingWork(need.id);
    try {
      await api(`/projects/${project.id}/needs/${need.id}/confirm-work`, { method: "POST" });
      toast.success("🎉 Work confirmed & bounty released!");
      invalidate(`/projects/${project.id}`, "/me/tolken", "/me");
      onReload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActingWork(null);
    }
  }

  async function shareBounty(need: NeedOut) {
    const url = `${window.location.origin}/projects/${project.id}?bounty=${need.id}&tab=needs`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bounty: ${need.bounty_tolken ?? 0} Tolken for ${need.skill.name}`,
          text: `Help build ${project.title} on Nodal!`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Bounty link copied! Share with friends or Twitter/X.");
    } catch {
      toast(url);
    }
  }

  async function fund(need: NeedOut) {
    setFunding(need.id);
    try {
      await api(`/projects/${project.id}/needs/${need.id}/fund`, { method: "POST" });
      toast.success("Bounty funded", { description: `${formatTolken(need.bounty_tolken!)} held for ${need.skill.name}` });
      invalidate("/me/tolken", "/me");
      ledger.reload();
      onReload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFunding(null);
    }
  }

  async function toggleStatus(need: NeedOut) {
    setBusyNeed(need.id);
    const nextStatus = need.status === "open" ? "filled" : "open";
    try {
      await api(`/projects/${project.id}/needs/${need.id}`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      toast.success(nextStatus === "filled" ? "Need marked as filled" : "Need reopened");
      invalidate(`/projects/${project.id}`);
      onReload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyNeed(null);
    }
  }

  async function deleteNeed(need: NeedOut) {
    if (!confirm(`Remove ${need.skill.name} from project needs?`)) return;
    setBusyNeed(need.id);
    try {
      await api(`/projects/${project.id}/needs/${need.id}`, { method: "DELETE" });
      toast.success("Need removed");
      invalidate(`/projects/${project.id}`);
      onReload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyNeed(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {owner && pendingRequests.length > 0 && (
        <div className="rounded-xl border border-teal/40 bg-teal-tint/30 p-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-teal animate-pulse" />
            <h3 className="text-sm font-bold text-ink">Incoming Collaborator Requests ({pendingRequests.length})</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-line">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar person={req.from_profile} size={36} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/u/${req.from_profile.handle}`} className="font-bold text-sm hover:underline truncate">
                        {req.from_profile.display_name || req.from_profile.handle}
                      </Link>
                      <span className="text-xs bg-sunken px-2 py-0.5 rounded font-medium text-muted-ink">
                        for {req.skill.name}
                      </span>
                    </div>
                    {req.message && <p className="text-xs text-muted-ink mt-0.5 line-clamp-2">{req.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => respondRequest(req.id, "accepted")} className={cn(btn.match, "h-8 px-3 text-xs")}>
                    Accept
                  </button>
                  <button onClick={() => respondRequest(req.id, "declined")} className={cn(btn.secondary, "h-8 px-2.5 text-xs")}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {owner && (
        <div className="flex items-center justify-between border-b border-line pb-3">
          <p className="text-sm font-semibold">
            {project.needs.filter((n) => n.status === "open").length} open needs
          </p>
          <button onClick={() => setAddingNeed(true)} className={cn(btn.primary, "h-8 text-xs")}>
            <Plus className="size-3.5" /> Add need
          </button>
        </div>
      )}

      {project.needs.length === 0 ? (
        <EmptyState
          action={
            owner ? (
              <button onClick={() => setAddingNeed(true)} className={btn.primary}>
                Add your first needed skill
              </button>
            ) : undefined
          }
        >
          No needs listed yet.
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {project.needs.map((n) => {
            const entry = ledger.data?.ledger.find((e) => e.need_id === n.id && ["funded", "released"].includes(e.status));
            const isHighlighted = highlightedBountyId === n.id;
            return (
              <li
                key={n.id}
                id={`need-${n.id}`}
                className={cn(
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center transition-all duration-300",
                  n.viewer_fits && n.status === "open" && "bg-teal-tint/50",
                  isHighlighted && "ring-2 ring-teal bg-teal-tint/30 rounded-lg",
                  n.status === "claimed" && "bg-amber-500/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                    {n.skill.name}
                    {n.bounty_tolken && (
                      <span className="inline-flex items-center gap-1 rounded bg-teal/10 px-1.5 py-0.5 text-xs font-bold text-teal">
                        <Award className="size-3" />
                        {formatTolken(n.bounty_tolken)} bounty
                      </span>
                    )}
                    {n.status === "filled" && <span className="rounded bg-sunken px-1.5 py-0.5 text-xs font-medium text-muted-ink">Filled</span>}
                    {n.status === "claimed" && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-700">Work Submitted</span>}
                    {n.viewer_fits && n.status === "open" && <span className="text-xs text-teal">You fit</span>}
                  </p>
                  {n.note && <p className="mt-0.5 text-sm text-muted-ink">{n.note}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-ink">
                    <Fitters need={n} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {n.bounty_tolken ? (
                    <button
                      type="button"
                      onClick={() => shareBounty(n)}
                      className={cn(btn.ghost, "h-8 px-2 text-xs text-muted-ink hover:text-ink")}
                      title="Share bounty link"
                    >
                      <Share2 className="size-3.5 mr-1" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  ) : null}

                  {owner ? (
                    <>
                      {n.bounty_tolken ? (
                        entry ? (
                          <span className={cn(btn.done, "text-xs")}>
                            {entry.status === "released" ? "Paid" : "Funded"} {formatTolken(n.bounty_tolken)}
                          </span>
                        ) : (
                          <button onClick={() => fund(n)} disabled={funding === n.id} className={cn(btn.secondary, "text-xs")}>
                            {funding === n.id && <Loader2 className="size-3.5 animate-spin" />}
                            Fund {formatTolken(n.bounty_tolken)}
                          </button>
                        )
                      ) : null}

                      {n.status === "claimed" ? (
                        <button
                          onClick={() => confirmWork(n)}
                          disabled={actingWork === n.id}
                          className={cn(btn.match, "h-8 px-3 text-xs")}
                        >
                          {actingWork === n.id && <Loader2 className="size-3.5 animate-spin mr-1" />}
                          Confirm Work & Release
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleStatus(n)}
                          disabled={busyNeed === n.id}
                          className={cn(btn.ghost, "h-8 px-2 text-xs")}
                          title={n.status === "open" ? "Mark as filled" : "Reopen need"}
                        >
                          {n.status === "open" ? <Check className="size-3.5" /> : "Reopen"}
                        </button>
                      )}

                      <button onClick={() => setEditingNeed(n)} className={cn(btn.ghost, "h-8 px-2 text-xs")} title="Edit need">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => deleteNeed(n)} disabled={busyNeed === n.id} className={cn(btn.ghost, "h-8 px-2 text-xs text-cool hover:bg-cool/10")} title="Delete need">
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {n.status === "open" && (
                        <CollabButton project={project} skillId={n.skill.id} label="Offer" className="w-full sm:w-auto" />
                      )}
                      {onTeam && n.status === "open" && (
                        <button
                          onClick={() => submitWork(n)}
                          disabled={actingWork === n.id}
                          className={cn(btn.primary, "h-8 px-3 text-xs")}
                        >
                          {actingWork === n.id && <Loader2 className="size-3.5 animate-spin mr-1" />}
                          Submit Work
                        </button>
                      )}
                      {n.status === "claimed" && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          Awaiting Approval
                        </span>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {addingNeed && (
        <AddNeedDialog
          projectId={project.id}
          excludeSkillIds={project.needs.map((n) => n.skill.id)}
          open={addingNeed}
          onClose={() => setAddingNeed(false)}
          onAdded={() => {
            setAddingNeed(false);
            onReload();
          }}
        />
      )}

      {editingNeed && (
        <EditNeedDialog
          projectId={project.id}
          need={editingNeed}
          open={Boolean(editingNeed)}
          onClose={() => setEditingNeed(null)}
          onSaved={() => {
            setEditingNeed(null);
            onReload();
          }}
        />
      )}
    </div>
  );
}

function AddNeedDialog({
  projectId,
  excludeSkillIds,
  open,
  onClose,
  onAdded,
}: {
  projectId: string;
  excludeSkillIds: number[];
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [note, setNote] = useState("");
  const [bounty, setBounty] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!skill || saving) return;
    setSaving(true);
    try {
      await api(`/projects/${projectId}/needs`, {
        method: "POST",
        body: {
          skill_id: skill.id,
          note: note.trim() || null,
          bounty_tolken: Number(bounty) > 0 ? Number(bounty) : null,
        },
      });
      toast.success(`Added ${skill.name} to needs`);
      invalidate(`/projects/${projectId}`);
      onAdded();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Add a needed skill</DialogTitle>
        <DialogDescription>Select what kind of help you need and optionally attach a bounty.</DialogDescription>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold">Skill</label>
            {skill ? (
              <div className="flex items-center justify-between rounded-lg border border-line p-2 text-sm">
                <span className="font-semibold">{skill.name}</span>
                <button type="button" onClick={() => setSkill(null)} className="text-muted-ink hover:text-ink">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <SkillPicker exclude={excludeSkillIds} onAdd={setSkill} />
            )}
          </div>

          <div>
            <label htmlFor="need-note" className="mb-1 block text-xs font-semibold">
              Note <span className="font-normal text-muted-ink">(what will they build?)</span>
            </label>
            <input
              id="need-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Build the Bluetooth sync module"
              className={cn(inputClass, "h-10 text-xs")}
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="need-bounty" className="mb-1 block text-xs font-semibold">
              Bounty in Tolken <span className="font-normal text-muted-ink">(optional)</span>
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-line px-3 focus-within:border-ink">
              <span className="text-muted-ink">{TOLKEN}</span>
              <input
                id="need-bounty"
                inputMode="numeric"
                value={bounty}
                onChange={(e) => setBounty(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                placeholder="0"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={!skill || saving} className={btn.primary}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Add need
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditNeedDialog({
  projectId,
  need,
  open,
  onClose,
  onSaved,
}: {
  projectId: string;
  need: NeedOut;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(need.note ?? "");
  const [bounty, setBounty] = useState(need.bounty_tolken ? String(need.bounty_tolken) : "");
  const [status, setStatus] = useState<"open" | "claimed" | "filled">(need.status);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api(`/projects/${projectId}/needs/${need.id}`, {
        method: "PATCH",
        body: {
          note: note.trim() || null,
          bounty_tolken: Number(bounty) > 0 ? Number(bounty) : null,
          status,
        },
      });
      toast.success("Need updated");
      invalidate(`/projects/${projectId}`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Edit need: {need.skill.name}</DialogTitle>
        <DialogDescription>Update details, bounty, or status.</DialogDescription>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="edit-need-status" className="mb-1 block text-xs font-semibold">
              Status
            </label>
            <div className="flex gap-2">
              {(["open", "filled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs font-semibold capitalize transition-colors",
                    status === s ? "border-ink bg-ink text-white" : "border-line text-muted-ink hover:text-ink",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="edit-need-note" className="mb-1 block text-xs font-semibold">
              Note
            </label>
            <input
              id="edit-need-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={cn(inputClass, "h-10 text-xs")}
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="edit-need-bounty" className="mb-1 block text-xs font-semibold">
              Bounty in Tolken
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-line px-3 focus-within:border-ink">
              <span className="text-muted-ink">{TOLKEN}</span>
              <input
                id="edit-need-bounty"
                inputMode="numeric"
                value={bounty}
                onChange={(e) => setBounty(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                placeholder="0"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btn.primary}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Discussion({ projectId, ownerId, onCount }: { projectId: string; ownerId: string; onCount: (n: number) => void }) {
  const { me, signedIn } = useSession();
  const comments = useApi<CommentOut[]>(`/projects/${projectId}/comments`);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function deleteComment(id: string) {
    setDeletingId(id);
    try {
      await api(`/projects/${projectId}/comments/${id}`, { method: "DELETE" });
      const next = (comments.data ?? []).filter((c) => c.id !== id);
      comments.mutate(next);
      onCount(next.length);
      toast.success("Comment deleted");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
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
          {comments.data.map((c) => {
            const canDelete = me && (me.profile.id === c.author.id || me.profile.id === ownerId);
            return (
              <li key={c.id} className="group flex gap-3 py-4 first:pt-0">
                <Link href={`/u/${c.author.handle}`}>
                  <Avatar person={c.author} size={32} />
                </Link>
                <div className="min-w-0 flex-1 text-[15px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="flex items-baseline gap-2">
                      <Link href={`/u/${c.author.handle}`} className="font-semibold hover:underline">
                        {c.author.handle}
                      </Link>
                      <span className="text-xs text-muted-ink">{timeAgo(c.created_at)}</span>
                    </p>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        disabled={deletingId === c.id}
                        className="text-muted-ink opacity-0 transition-opacity hover:text-cool group-hover:opacity-100"
                        title="Delete comment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </div>
              </li>
            );
          })}
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
