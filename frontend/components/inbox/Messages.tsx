"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import { Label } from "@/components/Meta";
import { api } from "@/lib/api";
import type { ConversationOut, MessageOut, ThreadOut } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ago, displayName } from "./format";

const kindLabel: Record<MessageOut["kind"], string> = { text: "Message", invite: "Invite", nudge: "Follow-up" };

/** One conversation in the list: who, the last line, and how many are unread. */
export function ConversationRow({
  item,
  active,
  onOpen,
}: {
  item: ConversationOut;
  active: boolean;
  onOpen: () => void;
}) {
  const name = displayName(item.profile);
  return (
    <li>
      <button
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 px-5 py-3.5 text-left transition-colors focus-visible:outline-offset-[-3px]",
          active ? "bg-sunken" : "hover:bg-sunken/60",
        )}
      >
        <Avatar person={item.profile} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("truncate text-[15px]", item.unread ? "font-bold" : "font-semibold")}>{name}</span>
            <span className="shrink-0 text-xs text-muted-ink">{ago(item.last_at)}</span>
          </span>
          <span className={cn("mt-0.5 block truncate text-sm", item.unread ? "text-ink" : "text-muted-ink")}>
            {item.mine && "You: "}
            {item.last_body}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xs">
            <span className="font-medium text-teal">{kindLabel[item.last_kind]}</span>
            {item.project && <span className="truncate text-muted-ink">· {item.project.title}</span>}
            {item.unread > 0 && (
              <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-teal px-1.5 text-[11px] font-bold text-white">
                {item.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function Bubble({ message }: { message: MessageOut }) {
  const invite = message.kind !== "text";
  return (
    <li className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          message.mine ? "bg-teal-tint" : "bg-sunken",
          invite && "border border-teal/30",
        )}
      >
        {invite && <Label className="mb-1 text-teal">{kindLabel[message.kind]}</Label>}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={cn("mt-1 text-[11px] text-muted-ink", message.mine && "text-right")}>{ago(message.created_at)}</p>
      </div>
    </li>
  );
}

/** A 1:1 thread: the invite, any follow-up, and free-form replies in one place. */
export function MessageThread({
  profileId,
  onBack,
}: {
  profileId: string;
  onBack?: () => void;
}) {
  const thread = useApi<ThreadOut>(`/messages/${profileId}`);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [nudging, setNudging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialScrolledRef = useRef(false);

  const messageCount = thread.data?.messages.length ?? 0;

  useEffect(() => {
    // Opening a thread clears its unread count in the list.
    invalidate("/me/conversations");
  }, [profileId]);

  useEffect(() => {
    initialScrolledRef.current = false;
  }, [profileId]);

  useEffect(() => {
    if (messageCount === 0) return;
    if (!initialScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      initialScrolledRef.current = true;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api("/messages", { method: "POST", body: { to_profile_id: profileId, body: text } });
      setBody("");
      thread.reload();
      invalidate("/me/conversations");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function nudge() {
    setNudging(true);
    try {
      await api(`/messages/${profileId}/nudge`, { method: "POST" });
      toast.success("Follow-up sent");
      thread.reload();
      invalidate("/me/conversations");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setNudging(false);
    }
  }

  if (thread.error) {
    return (
      <div className="flex h-full flex-col min-h-0 bg-white">
        <header className="shrink-0 border-b border-line bg-white px-4 py-3 lg:px-8 lg:py-3.5">
          <div className="mx-auto flex max-w-[720px] items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to messages"
                className="flex size-9 items-center justify-center rounded-lg text-ink hover:bg-sunken -ml-1 lg:hidden"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <span className="text-sm font-semibold">Messages</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <ErrorState error={thread.error} onRetry={thread.reload} className="py-8" />
        </div>
      </div>
    );
  }

  if (!thread.data) {
    return (
      <div className="flex h-full flex-col min-h-0 bg-white">
        <header className="shrink-0 border-b border-line bg-white px-4 py-3 lg:px-8 lg:py-3.5">
          <div className="mx-auto flex max-w-[720px] items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to messages"
                className="flex size-9 items-center justify-center rounded-lg text-ink hover:bg-sunken -ml-1 lg:hidden"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-full bg-sunken animate-pulse" />
            <div className="h-4 w-32 rounded bg-sunken animate-pulse" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[720px]">
            <RowsSkeleton rows={3} className="py-4" />
          </div>
        </div>
      </div>
    );
  }

  const { profile, project, messages, can_nudge } = thread.data;
  const name = displayName(profile);

  return (
    <div className="flex h-full flex-col min-h-0 bg-white">
      <header className="shrink-0 border-b border-line bg-white px-4 py-3 lg:px-8 lg:py-3.5">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to messages"
              className="flex size-9 items-center justify-center rounded-lg text-ink hover:bg-sunken -ml-1 lg:hidden"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <Avatar person={profile} size={42} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] sm:text-base font-extrabold tracking-tight">{name}</h2>
            <p className="flex items-center gap-2 text-xs sm:text-[13px] text-muted-ink">
              <span className="truncate">@{profile.handle}</span>
              {project && (
                <Link
                  href={`/projects/${project.id}`}
                  className="flex min-w-0 items-center gap-0.5 truncate font-medium text-ink hover:underline"
                >
                  <span className="truncate">{project.title}</span>
                  <ArrowUpRight className="size-3 shrink-0" />
                </Link>
              )}
            </p>
          </div>
          <Link
            href={`/u/${profile.handle}`}
            className={cn(btn.secondary, "h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm shrink-0")}
          >
            <span className="hidden sm:inline">View profile</span>
            <span className="sm:hidden">Profile</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 lg:px-8">
        <div className="mx-auto max-w-[720px]">
          {messages.length === 0 ? (
            <EmptyState
              title={`Message ${name}`}
              body="Say hello, or ask what they're working on. Invites you send from a project show up here too."
              className="py-12"
            />
          ) : (
            <ul className="flex flex-col gap-2.5 py-2">
              {messages.map((m) => (
                <Bubble key={m.id} message={m} />
              ))}
              <div ref={messagesEndRef} />
            </ul>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-line bg-white px-4 py-3 lg:px-8 lg:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[720px]">
          {can_nudge && (
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal/30 bg-teal-tint/60 px-3 py-2">
              <p className="text-[13px]">
                <span className="font-semibold">Invite sent.</span> <span className="text-muted-ink">No reply yet.</span>
              </p>
              <button
                type="button"
                onClick={nudge}
                disabled={nudging}
                className="text-[13px] font-semibold text-teal hover:underline disabled:opacity-60"
              >
                {nudging && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
                Ask if they&apos;ve seen it
              </button>
            </div>
          )}

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor="message-body" className="sr-only">
              Message {name}
            </label>
            <textarea
              id="message-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={`Message ${name.split(" ")[0]}`}
              className="min-h-11 max-h-32 flex-1 resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-ink hover:border-ink/30 focus:border-ink"
            />
            <button
              type="submit"
              disabled={!body.trim() || sending}
              className={cn(
                btn.primary,
                "h-11 px-3.5 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 font-semibold shrink-0 transition-opacity",
                (!body.trim() || sending) && "opacity-50 cursor-not-allowed",
              )}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="max-sm:sr-only">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
