"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatTolken } from "@/lib/cover";
import { me, type Project, viewerFits } from "@/lib/catalog";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function requestKey(projectId: string, skill: string) {
  return `${projectId}:${skill}`;
}

/** True when the viewer already asked to help with any need on this project. */
export function useRequested(project: Project) {
  const { requested } = useDemoStore();
  return project.needs.some((n) => requested.has(requestKey(project.id, n.skill)));
}

/**
 * The collab request flow (POST /projects/{id}/collab-requests): pick the need you can fill, say what you'd do first.
 * Shared by "Join this idea" and "Offer to help" everywhere.
 */
export function CollabDialog({
  project,
  open,
  onOpenChange,
  skill,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a need. */
  skill?: string;
}) {
  const { requested, add } = useDemoStore();
  const idea = project.stage === "idea";
  const firstFit = project.needs.find((n) => viewerFits(project, n))?.skill;
  const [choice, setChoice] = useState(skill ?? firstFit ?? project.needs[0]?.skill);
  const [message, setMessage] = useState("");

  function send() {
    if (!choice) return;
    add("requested", requestKey(project.id, choice));
    toast.success(`Request sent to ${project.owner.handle}`, { description: `${choice} for ${project.title}` });
    setMessage("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="gap-5 rounded-xl p-6 sm:max-w-[440px]">
        <div>
          <DialogTitle className="text-lg font-extrabold tracking-tight">
            {idea ? "Join" : "Help with"} {project.title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-ink">
            {project.owner.name} sees your skills and this note, then accepts or declines.
          </DialogDescription>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">What would you take on?</legend>
          {project.needs.map((n) => {
            const key = requestKey(project.id, n.skill);
            const sent = requested.has(key);
            const fits = viewerFits(project, n);
            const on = choice === n.skill;
            return (
              <label
                key={n.skill}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  on ? "border-teal bg-teal-tint/50" : "border-line hover:bg-sunken",
                  sent && "cursor-default opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="need"
                  className="mt-1 accent-teal"
                  checked={on}
                  disabled={sent}
                  onChange={() => setChoice(n.skill)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                    {n.skill}
                    {n.bounty_tolken && <span className="font-mono text-xs text-teal">{formatTolken(n.bounty_tolken)} bounty</span>}
                  </span>
                  <span className="block text-[13px] text-muted-ink">{n.note}</span>
                </span>
                {sent ? (
                  <span className="font-mono text-[11px] uppercase text-teal">Sent</span>
                ) : (
                  fits && <span className="font-mono text-[11px] uppercase text-teal">You offer this</span>
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
            placeholder="What you'd do first, and when you're free"
            className="resize-none rounded-lg border border-line px-3 py-2.5 text-sm outline-none placeholder:text-muted-ink focus:border-ink"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button className={btn.ghost} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className={btn.match}
            disabled={!choice || requested.has(requestKey(project.id, choice))}
            onClick={send}
          >
            Send request
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The one button that opens the dialog, with its settled state. */
export function CollabButton({ project, className, skill, label }: { project: Project; className?: string; skill?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const { requested } = useDemoStore();
  const anyRequested = useRequested(project);
  const sent = skill ? requested.has(requestKey(project.id, skill)) : anyRequested;
  if (project.owner.handle === me.handle || project.needs.length === 0) return null;
  const text = label ?? (project.stage === "idea" ? "Join this idea" : "Offer to help");
  return (
    <>
      {sent ? (
        <button className={cn(btn.done, className)} onClick={() => setOpen(true)}>
          <Check className="size-4" /> Requested
        </button>
      ) : (
        <button className={cn(btn.match, className)} onClick={() => setOpen(true)}>
          {text}
        </button>
      )}
      <CollabDialog project={project} open={open} onOpenChange={setOpen} skill={skill} />
    </>
  );
}
