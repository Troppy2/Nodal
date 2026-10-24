"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { NeedOut, ProfileLite } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { invalidate } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/**
 * Inviting someone to your project sends a real DM. The confirmation you see here is the
 * same message they receive, so there is nothing to reconcile afterwards.
 */
export function InviteDialog({
  project,
  person,
  need,
  open,
  onOpenChange,
  onInvited,
}: {
  project: { id: string; title: string };
  person: ProfileLite;
  need?: NeedOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [asked, setAsked] = useState(false);
  const [asking, setAsking] = useState(false);
  const name = person.display_name || person.handle;
  const first = name.split(" ")[0];

  async function send() {
    setSending(true);
    try {
      await api(`/messages/${person.id}/invite`, {
        method: "POST",
        body: { project_id: project.id, skill_id: need?.skill.id ?? null, body: note.trim() || null },
      });
      setSent(true);
      onInvited?.();
      invalidate("/me/conversations");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function ask() {
    setAsking(true);
    try {
      await api(`/messages/${person.id}/nudge`, { method: "POST" });
      setAsked(true);
      invalidate("/me/conversations");
      toast.success("Follow-up sent", { description: `${first} will see it in the same thread.` });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAsking(false);
    }
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      // Keep the settled state for the session, then allow a fresh invite later.
      setNote("");
      setSent(false);
      setAsked(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="gap-5 rounded-xl p-6 sm:max-w-[440px]">
        {sent ? (
          <>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-tint text-teal">
                <Check className="size-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-extrabold tracking-tight">Invite sent to {first}</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-ink">
                  It&apos;s already in your Messages with {name}, and they see it as a DM. Nothing else to send.
                </DialogDescription>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-sunken/60 p-3">
              <p className="text-[13px] leading-relaxed">
                <span className="font-semibold">{project.title}</span>
                {need && <span className="text-muted-ink"> · {need.skill.name}</span>}
              </p>
              <p className="mt-1 text-[13px] text-muted-ink">
                {asked ? "You asked if they've seen it. Give them a moment to reply." : "No answer yet. You can ask once, in the same thread, instead of starting a new one."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!asked ? (
                <button onClick={ask} disabled={asking} className={cn(btn.secondary, "max-sm:flex-1")}>
                  {asking && <Loader2 className="size-4 animate-spin" />}
                  Ask if they&apos;ve seen it
                </button>
              ) : (
                <span className={cn(btn.done, "max-sm:flex-1")}>
                  <Check className="size-4" /> Follow-up sent
                </span>
              )}
              <Link
                href={`/inbox?thread=m:${person.id}`}
                onClick={() => close(false)}
                className={cn(btn.primary, "max-sm:flex-1")}
              >
                <Send className="size-4" /> Open messages
              </Link>
            </div>
          </>
        ) : (
          <>
            <div>
              <DialogTitle className="text-lg font-extrabold tracking-tight">Invite {first} to {project.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-ink">
                This sends a DM, not just a notification. {first} can reply in the same thread.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-line p-3">
              <Avatar person={person} size={36} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-[13px] text-muted-ink">
                  {need ? `Fills ${need.skill.name}` : "Offers skills this project needs"}
                </p>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Add a note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={`Hi ${first} — I'm building ${project.title} and could use your ${need?.skill.name ?? "help"}.`}
                className="resize-none rounded-lg border border-line px-3 py-2.5 text-sm outline-none placeholder:text-muted-ink focus:border-ink"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button className={btn.ghost} onClick={() => close(false)}>
                Cancel
              </button>
              <button className={btn.match} onClick={send} disabled={sending}>
                {sending && <Loader2 className="size-4 animate-spin" />}
                Send invite
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
