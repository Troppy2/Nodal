"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { ProjectCard } from "@/lib/api-types";
import { formatTolken } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/**
 * The collab request flow (POST /projects/{id}/collab-requests): pick the need you can fill, say what you'd do first.
 * Shared by "Join this idea" and "Offer to help" everywhere.
 */
export function CollabDialog({
  project,
  open,
  onOpenChange,
  skillId,
  onSent,
}: {
  project: ProjectCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a need. */
  skillId?: number;
  onSent?: (skillId: number) => void;
}) {
  const openNeeds = project.needs.filter((n) => n.status === "open");
  const firstFit = openNeeds.find((n) => n.viewer_fits && !n.viewer_requested)?.skill.id;
  const firstFree = openNeeds.find((n) => !n.viewer_requested)?.skill.id;
  const [choice, setChoice] = useState<number | undefined>(skillId ?? firstFit ?? firstFree);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const idea = project.stage === "idea";
  const owner = project.owner.display_name || project.owner.handle;

  async function send() {
    if (!choice) return;
    setSending(true);
    try {
      await api(`/projects/${project.id}/collab-requests`, {
        method: "POST",
        body: { skill_id: choice, message: message.trim() || null },
      });
      const skill = openNeeds.find((n) => n.skill.id === choice)?.skill.name;
      toast.success(`Request sent to ${owner}`, { description: `${skill} for ${project.title}` });
      setMessage("");
      onSent?.(choice);
      invalidate(`/projects/${project.id}`, "/feed", "/projects?", "/me/inbox");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="gap-5 rounded-xl p-6 sm:max-w-[440px]">
        <div>
          <DialogTitle className="text-lg font-extrabold tracking-tight">
            {idea ? "Join" : "Help with"} {project.title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-ink">
            {owner} sees your skills and this note, then accepts or declines.
          </DialogDescription>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">What would you take on?</legend>
          {openNeeds.map((n) => {
            const sent = n.viewer_requested;
            const on = choice === n.skill.id;
            return (
              <label
                key={n.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  on ? "border-teal bg-teal-tint/50" : "border-line hover:border-ink/30 hover:bg-sunken",
                  sent && "cursor-default opacity-60 hover:bg-transparent",
                )}
              >
                <input
                  type="radio"
                  name="need"
                  className="mt-1 accent-teal"
                  checked={on}
                  disabled={sent}
                  onChange={() => setChoice(n.skill.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                    {n.skill.name}
                    {n.bounty_tolken && <span className="text-xs font-medium text-teal">{formatTolken(n.bounty_tolken)} bounty</span>}
                  </span>
                  {n.note && <span className="block text-[13px] text-muted-ink">{n.note}</span>}
                </span>
                {sent ? (
                  <span className="text-xs text-teal">Sent</span>
                ) : (
                  n.viewer_fits && <span className="text-xs text-teal">You offer this</span>
                )}
              </label>
            );
          })}
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Note</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What you'd do first, and when you're free"
            className="resize-none rounded-lg border border-line px-3 py-2.5 text-sm outline-none placeholder:text-muted-ink focus:border-ink"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button className={btn.ghost} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className={btn.match} disabled={!choice || sending} onClick={send}>
            {sending && <Loader2 className="size-4 animate-spin" />}
            Send request
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The one button that opens the dialog, with its settled state. Hidden on your own projects. */
export function CollabButton({
  project,
  skillId,
  className,
  label,
}: {
  project: ProjectCard;
  skillId?: number;
  className?: string;
  label?: string;
}) {
  const { me, signedIn } = useSession();
  const [open, setOpen] = useState(false);
  const [sentHere, setSentHere] = useState<number[]>([]);
  const openNeeds = project.needs.filter((n) => n.status === "open");
  if (openNeeds.length === 0 || me?.profile.id === project.owner.id) return null;

  const requested = (id: number) => sentHere.includes(id) || openNeeds.some((n) => n.skill.id === id && n.viewer_requested);
  const sent = skillId !== undefined ? requested(skillId) : openNeeds.every((n) => requested(n.skill.id));
  const text = label ?? (project.stage === "idea" ? "Join this idea" : "Offer to help");

  // Signed-out visitors go to sign in first.
  if (!signedIn) {
    return (
      <Link href="/" className={cn(btn.match, className)}>
        {text}
      </Link>
    );
  }
  return (
    <>
      {sent ? (
        <span className={cn(btn.done, "pointer-events-none", className)}>
          <Check className="size-4" /> Requested
        </span>
      ) : (
        <button className={cn(btn.match, className)} onClick={() => setOpen(true)}>
          {text}
        </button>
      )}
      {open && (
        <CollabDialog
          project={project}
          open={open}
          onOpenChange={setOpen}
          skillId={skillId}
          onSent={(id) => setSentHere((s) => [...s, id])}
        />
      )}
    </>
  );
}
