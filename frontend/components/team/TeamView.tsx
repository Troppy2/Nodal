"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { CoverArt } from "@/components/feed/CoverArt";
import { Label, ProjectMeta } from "@/components/Meta";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { me, type Project } from "@/lib/catalog";
import { tints } from "@/lib/cover";
import { stillOpenFor, teamFor } from "@/lib/seed-team";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { ShareBar, ShareTotal } from "./ShareBar";
import { TeamList } from "./TeamList";

export function TeamView({ project }: { project: Project }) {
  const own = project.owner.handle === me.handle;
  const [members, setMembers] = useState(() => teamFor(project));
  const { invited, add } = useDemoStore();
  const total = members.reduce((s, m) => s + (m.status === "joined" ? (m.share_bps ?? 0) : 0), 0);
  const setShare = (handle: string, bps: number) =>
    setMembers((ms) => ms.map((m) => (m.person.handle === handle ? { ...m, share_bps: bps } : m)));
  const open = stillOpenFor(project, members);
  const back = own ? `/projects/${project.id}/results` : `/projects/${project.id}`;

  return (
    <>
      <MobileHeader title={project.title} subtitle="Team and shares" back={back} />
      <div className="mx-auto max-w-[760px] px-4 py-5 lg:px-8 lg:py-7">
        <header className="hidden items-center gap-4 lg:flex">
          <CoverArt cover={project.cover} seed={project.id} className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{project.title}</h1>
            <ProjectMeta project={{ ...project, stage: project.stage === "idea" ? "building" : project.stage }} className="mt-1" />
          </div>
          <Link href={back} className={btn.secondary}>
            Back to project
          </Link>
        </header>

        <section aria-labelledby="team-title" className="lg:mt-7">
          <div className="flex items-baseline justify-between">
            <h2 id="team-title" className="text-[15px] font-bold">
              Team and shares
            </h2>
            <ShareTotal bps={total} />
          </div>
          <ShareBar
            className="mt-3"
            segments={members
              .filter((m) => m.status === "joined")
              .map((m) => ({ bps: m.share_bps ?? 0, color: tints[m.person.tint].fg, label: m.person.name }))}
          />
          <Label className="mb-3 mt-2">
            {own ? "Tolken bounties are split by these shares" : "Only the owner can change shares"}
          </Label>
          <TeamList members={members} onShare={setShare} editable={own} />

          {open && own && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-4">
              <Avatar person={open.person} size={40} />
              <div className="min-w-0 flex-1">
                <Label>Still open</Label>
                <p className="text-[15px] font-semibold">{open.need.skill}</p>
                <p className="text-sm text-muted-ink">
                  {open.person.name} fits this. {open.need.note}.
                </p>
              </div>
              {invited.has(open.person.handle) ? (
                <span className={btn.done}>
                  <Check className="size-4" /> Invited
                </span>
              ) : (
                <button
                  onClick={() => {
                    add("invited", open.person.handle);
                    toast.success(`Invite sent to ${open.person.name.split(" ")[0]}`, { description: `${open.need.skill} for ${project.title}` });
                  }}
                  className={cn(btn.match, "max-sm:w-full")}
                >
                  Invite {open.person.name.split(" ")[0]}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
