"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Link2, Loader2, MessageCircle, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { ProjectGrid } from "@/components/explore/ProjectTile";
import { Label } from "@/components/Meta";
import { EmptyState, ErrorState, SignInPrompt } from "@/components/project/states";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabStrip } from "@/components/Tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { Cycle, MeOut, ProfileOut, ProjectCard } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { ContributionGraph } from "./ContributionGraph";
import { OfferEditor } from "./OfferEditor";
import { TolkenPanel } from "./TolkenPanel";

type Tab = "projects" | "ideas" | "tolken";

/** /u/me resolves to the signed-in viewer's handle; everything else is a public profile. */
export function ProfileView({ handle }: { handle: string }) {
  const { ready, signedIn, me } = useSession();
  if (handle === "me") {
    if (!ready) return <ProfileSkeleton />;
    if (!signedIn || !me)
      return (
        <div className="mx-auto max-w-[920px] px-4 py-10 lg:px-8">
          <SignInPrompt>Sign in with your name to get a profile, list your skills, and get matched.</SignInPrompt>
        </div>
      );
    return <Profile handle={me.profile.handle} />;
  }
  return <Profile handle={handle} />;
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[920px] px-4 py-6 lg:px-8 lg:py-10" aria-busy="true" aria-label="Loading profile">
      <div className="flex gap-5">
        <Skeleton className="size-[72px] rounded-full lg:size-[104px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="mt-10 h-24 w-full" />
    </div>
  );
}

function Profile({ handle }: { handle: string }) {
  const profile = useApi<ProfileOut>(`/profiles/${encodeURIComponent(handle)}`);
  const [tab, setTab] = useState<Tab>("projects");

  if (profile.error) {
    const missing = profile.error instanceof ApiError && profile.error.status === 404;
    return (
      <>
        <MobileHeader title={`@${handle}`} back="/feed" />
        <div className="mx-auto max-w-[920px] px-4 py-10 lg:px-8">
          {missing ? (
            <EmptyState
              action={
                <Link href="/explore" className={btn.secondary}>
                  Find people
                </Link>
              }
            >
              No one goes by @{handle}.
            </EmptyState>
          ) : (
            <ErrorState message={profile.error.message} onRetry={profile.reload} />
          )}
        </div>
      </>
    );
  }
  if (!profile.data) return <ProfileSkeleton />;

  const p = profile.data;
  const own = p.is_me;
  const builds = p.projects.filter((x) => x.stage !== "idea");
  const ideas = p.projects.filter((x) => x.stage === "idea");
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "projects", label: "Projects", count: builds.length },
    { id: "ideas", label: "Ideas", count: ideas.length },
    ...(own ? [{ id: "tolken" as const, label: "Tolken" }] : []),
  ];
  const name = p.profile.display_name ?? p.profile.handle;

  const facts: [number, string][] = [
    [p.stats.projects, p.stats.projects === 1 ? "project" : "projects"],
    [p.stats.stars, p.stats.stars === 1 ? "star" : "stars"],
    [p.stats.collaborations, p.stats.collaborations === 1 ? "collab" : "collabs"],
    [p.stats.followers, p.stats.followers === 1 ? "follower" : "followers"],
  ];

  const actions = own ? (
    <OwnActions handle={p.profile.handle} />
  ) : (
    <>
      <FollowButton profile={p} mutate={profile.mutate} />
      <Link href={`/inbox?thread=m:${p.profile.id}`} className={btn.secondary}>
        <MessageCircle className="size-4" /> Message
      </Link>
    </>
  );

  return (
    <>
      <MobileHeader title={`@${p.profile.handle}`} back={own ? null : "/feed"} />
      <div className="mx-auto max-w-[920px] px-4 py-6 lg:px-8 lg:py-10">
        <header className="flex gap-5 lg:gap-8">
          <Avatar person={p.profile} size={72} className="lg:hidden" />
          <Avatar person={p.profile} size={104} className="max-lg:hidden" />
          <div className="min-w-0 flex-1">
            {own ? (
              <NameBio profile={p} onSaved={(me) => profile.mutate((prev) => ({ ...prev!, profile: me.profile, bio: me.bio }))} />
            ) : (
              <>
                <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[28px]">{name}</h1>
                <p className="text-[13px] text-muted-ink">@{p.profile.handle}</p>
                {p.bio && <p className="mt-2 max-w-lg text-[15px] leading-relaxed">{p.bio}</p>}
              </>
            )}
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-ink">
              {facts.map(([n, label]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dd className="text-[13px] font-medium text-ink">{n}</dd>
                  <dt>{label}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 border-t border-line pt-6 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-6">
            <OfferEditor
              key={p.offers.map((o) => `${o.skill.id}:${o.level}`).join(",")}
              offers={p.offers}
              editable={own}
              onSaved={(me) => profile.mutate((prev) => ({ ...prev!, offers: me.offers }))}
            />
            <Interests
              interests={p.interests}
              editable={own}
              onSaved={(me) => profile.mutate((prev) => ({ ...prev!, interests: me.interests }))}
            />
          </div>
          {own && <Cycles />}
        </div>

        <div className="mt-8">
          <ContributionGraph handle={p.profile.handle} />
        </div>

        <TabStrip className="mt-8" value={tab} onChange={setTab} tabs={tabs} />

        <div className="pt-5">
          {tab === "projects" && (
            <TabGrid list={builds} empty={own ? "You haven't posted a project yet." : `${name} hasn't posted a project yet.`} cta={own ? "Post a project" : undefined} />
          )}
          {tab === "ideas" && (
            <TabGrid list={ideas} empty={own ? "Post an idea and Nodal finds people who can build it with you." : "No open ideas."} cta={own ? "Post an idea" : undefined} />
          )}
          {tab === "tolken" && own && <TolkenPanel />}
        </div>
      </div>
    </>
  );
}

function OwnActions({ handle }: { handle: string }) {
  const { signOut } = useSession();
  const router = useRouter();
  async function share() {
    const url = `${window.location.origin}/u/${handle}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast(url);
    }
  }
  return (
    <>
      <button className={btn.secondary} onClick={share}>
        <Link2 className="size-4" /> Share profile
      </button>
      <button
        className={btn.ghost}
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
      >
        Sign out
      </button>
    </>
  );
}

function FollowButton({ profile, mutate }: { profile: ProfileOut; mutate: (fn: (p: ProfileOut | undefined) => ProfileOut) => void }) {
  const { signedIn } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const following = profile.viewer_follows;

  async function toggle() {
    if (!signedIn) {
      toast(`Sign in to follow ${profile.profile.handle}`, { action: { label: "Sign in", onClick: () => router.push("/") } });
      return;
    }
    setBusy(true);
    mutate((p) => ({ ...p!, viewer_follows: !following, stats: { ...p!.stats, followers: p!.stats.followers + (following ? -1 : 1) } }));
    try {
      const res = await api<{ following: boolean; count: number }>(`/profiles/${profile.profile.id}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      mutate((p) => ({ ...p!, viewer_follows: res.following, stats: { ...p!.stats, followers: res.count } }));
      invalidate("/feed");
    } catch (e) {
      mutate((p) => ({ ...p!, viewer_follows: following, stats: { ...p!.stats, followers: p!.stats.followers + (following ? 1 : -1) } }));
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button aria-pressed={following} onClick={toggle} disabled={busy} className={following ? btn.secondary : btn.primary}>
      {following ? "Following" : "Follow"}
    </button>
  );
}

/** Own profile: name and bio, edited in place with PATCH /me. */
function NameBio({ profile, onSaved }: { profile: ProfileOut; onSaved: (me: MeOut) => void }) {
  const { refreshMe } = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const me = await api<MeOut>("/me", { method: "PATCH", body: { display_name: name.trim(), bio: bio.trim() } });
      onSaved(me);
      await refreshMe();
      invalidate("/feed");
      setEditing(false);
      toast.success("Profile saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing)
    return (
      <>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight tracking-[-0.02em] lg:text-[28px]">
          {profile.profile.display_name ?? profile.profile.handle}
          <button
            aria-label="Edit name and bio"
            onClick={() => setEditing(true)}
            className="flex size-9 items-center justify-center rounded-md text-muted-ink hover:bg-sunken hover:text-ink"
          >
            <Pencil className="size-4" />
          </button>
        </h1>
        <p className="text-[13px] text-muted-ink">@{profile.profile.handle}</p>
        {profile.bio ? (
          <p className="mt-2 max-w-lg text-[15px] leading-relaxed">{profile.bio}</p>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-2 text-[15px] text-muted-ink hover:text-ink hover:underline">
            Add a short bio
          </button>
        )}
      </>
    );

  return (
    <form onSubmit={save} className="flex max-w-lg flex-col gap-2">
      <label htmlFor="name" className="sr-only">
        Name
      </label>
      <input
        id="name"
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        className="h-11 rounded-lg border border-line px-3 text-lg font-bold outline-none focus:border-ink"
      />
      <label htmlFor="bio" className="sr-only">
        Bio
      </label>
      <textarea
        id="bio"
        value={bio}
        rows={2}
        maxLength={280}
        onChange={(e) => setBio(e.target.value)}
        placeholder="What you build and what you're looking for"
        className="resize-none rounded-lg border border-line px-3 py-2 text-[15px] outline-none placeholder:text-muted-ink focus:border-ink"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || saving} className={btn.primary}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save
        </button>
        <button type="button" className={btn.ghost} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Interest tags steer recommendations. Own profile edits them with PUT /me/interests (up to 10). */
function Interests({ interests, editable, onSaved }: { interests: string[]; editable: boolean; onSaved: (me: MeOut) => void }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(next: string[]) {
    setSaving(true);
    try {
      const me = await api<MeOut>("/me/interests", { method: "PUT", body: { interests: next } });
      onSaved(me);
      invalidate("/feed", "/me");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const tag = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || interests.includes(tag)) return setDraft("");
    if (interests.length >= 10) return toast.error("Up to 10 interests.");
    setDraft("");
    save([...interests, tag]);
  }

  if (!editable && interests.length === 0) return null;
  return (
    <section>
      <Label className="mb-2.5">Interests</Label>
      <ul className="flex flex-wrap gap-1.5">
        {interests.map((tag) => (
          <li key={tag} className="flex h-8 items-center gap-0.5 rounded-md border border-line pl-2.5 pr-0.5 text-[13px]">
            #{tag}
            {editable && (
              <button
                aria-label={`Remove ${tag}`}
                disabled={saving}
                onClick={() => save(interests.filter((t) => t !== tag))}
                className="flex size-7 items-center justify-center rounded text-muted-ink hover:bg-sunken hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {interests.length === 0 && <li className="text-sm text-muted-ink">Add a few tags so recommendations fit you.</li>}
      </ul>
      {editable && interests.length < 10 && (
        <form onSubmit={add} className="mt-2 flex gap-2">
          <label htmlFor="interest" className="sr-only">
            Add an interest
          </label>
          <input
            id="interest"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a tag, like sensor-data"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink"
          />
          <button type="submit" disabled={!draft.trim() || saving} className={btn.secondary}>
            Add
          </button>
        </form>
      )}
    </section>
  );
}

/** Own profile: swaps and rings that include you, from GET /me/cycles. Each opens the inbox. */
function Cycles() {
  const { me } = useSession();
  const cycles = useApi<Cycle[]>("/me/cycles");
  return (
    <section>
      <Label className="mb-2.5">Swaps and rings</Label>
      {cycles.error ? (
        <ErrorState message={cycles.error.message} onRetry={cycles.reload} />
      ) : !cycles.data ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : cycles.data.length === 0 ? (
        <p className="text-sm text-muted-ink">
          None yet. Swaps show up when someone needs what you offer and offers what you need.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {cycles.data.map((c) => {
            const others = c.members.filter((m) => m.id !== me?.profile.id).map((m) => m.handle);
            const who = c.kind === "swap" ? `You and ${others[0]}` : `You, ${others.join(" and ")}`;
            return (
              <li key={c.id}>
                <Link
                  href="/inbox"
                  aria-label={`Open the ${c.kind} with ${others.join(" and ")} in your inbox`}
                  className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sunken focus-visible:outline-offset-[-3px]"
                >
                  <span className="w-10 shrink-0 text-xs font-semibold text-teal">{c.kind === "swap" ? "Swap" : "Ring"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{who}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-muted-ink transition-colors group-hover:text-ink">
                    Open
                    <ChevronRight className="size-3.5" strokeWidth={2.25} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TabGrid({ list, empty, cta }: { list: ProjectCard[]; empty: string; cta?: string }) {
  if (list.length === 0)
    return (
      <EmptyState
        action={
          cta ? (
            <Link href="/create" className={btn.secondary}>
              {cta}
            </Link>
          ) : undefined
        }
      >
        {empty}
      </EmptyState>
    );
  return <ProjectGrid projects={list} showOwner={false} />;
}

