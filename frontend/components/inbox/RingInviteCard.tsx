"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Label } from "@/components/Meta";
import { getProject, me } from "@/lib/catalog";
import type { Thread } from "@/lib/seed-inbox";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

export type Response = "pending" | "accepted" | "declined";

const first = (name: string) => name.split(" ")[0];

/** Each person's response, with the viewer's own response folded in. */
export function memberStatus(thread: Thread, mine: Response) {
  return thread.links.map((l) => {
    const isMe = l.who.handle === me.handle;
    const status: Response = isMe ? mine : (thread.responded[l.who.handle] ?? "pending");
    return { person: l.who, isMe, status };
  });
}

function settledText(thread: Thread, mine: Response) {
  if (mine === "declined") return thread.kind === "join" ? `You declined ${thread.name}'s request.` : `You declined this ${thread.kind}.`;
  if (thread.kind === "join") {
    const project = getProject(thread.links[0].projectId);
    return `${thread.name} joined ${project?.title ?? "your project"}.`;
  }
  const waiting = memberStatus(thread, mine).filter((m) => m.status !== "accepted");
  const label = thread.kind === "ring" ? "Ring accepted" : "Swap accepted";
  return waiting.length === 0 ? `${label} · everyone is in` : `${label} · waiting on ${waiting.map((m) => first(m.person.name)).join(" and ")}`;
}

/** Who fills what on whose project, with each member's response and the viewer's Accept / Decline. */
export function RingInviteCard({
  thread,
  response,
  onRespond,
}: {
  thread: Thread;
  response: Response;
  onRespond: (r: Exclude<Response, "pending">) => void;
}) {
  const statuses = memberStatus(thread, response);
  const team = thread.teamProjectId ? getProject(thread.teamProjectId) : undefined;
  const accept = thread.kind === "ring" ? "Accept ring" : thread.kind === "swap" ? "Accept swap" : "Accept";

  return (
    <div className="focus-inset overflow-hidden rounded-xl border border-line">
      <Label className="border-b border-line bg-sunken px-4 py-2.5">
        {thread.kind === "ring" ? "3-way ring" : thread.kind === "swap" ? "Skill swap" : "Join request"} · {thread.time} ago
      </Label>

      <ul className="divide-y divide-line">
        {thread.links.map((l, i) => {
          const project = getProject(l.projectId);
          const isMe = l.who.handle === me.handle;
          const status = statuses[i].status;
          return (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Avatar person={l.who} size={32} />
              <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                <span className="font-bold">{isMe ? "You" : first(l.who.name)}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-ink" aria-label="fill" />
                <span className="font-semibold">{l.skill}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-ink" aria-label="for" />
                {project ? (
                  <Link href={`/projects/${project.id}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                    {project.owner.handle === me.handle ? "your" : `${first(project.owner.name)}'s`} {project.title}
                  </Link>
                ) : (
                  <span>{l.projectId}</span>
                )}
              </p>
              {thread.kind !== "join" && (
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    status === "accepted" ? "text-teal" : status === "declined" ? "text-cool" : "text-muted-ink",
                  )}
                >
                  {status}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {thread.note && <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-ink/90">&ldquo;{thread.note}&rdquo;</p>}

      <div className="border-t border-line px-4 py-3">
        {response === "pending" ? (
          <div className="flex gap-2">
            <button onClick={() => onRespond("accepted")} className={cn(btn.match, "max-lg:h-11 max-lg:flex-1")}>
              {accept}
            </button>
            <button onClick={() => onRespond("declined")} className={cn(btn.secondary, "max-lg:h-11 max-lg:flex-1")}>
              Decline
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={cn("flex items-center gap-1.5 text-sm font-semibold", response === "accepted" ? "text-teal" : "text-muted-ink")}>
              {response === "accepted" && <Check className="size-4" />}
              {settledText(thread, response)}
            </p>
            {response === "accepted" && team && thread.kind !== "join" && (
              <Link href={`/projects/${team.id}/team`} className={btn.secondary}>
                Open team for {team.title}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
