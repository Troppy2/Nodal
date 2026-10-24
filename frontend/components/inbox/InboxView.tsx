"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Label } from "@/components/Meta";
import { getProject } from "@/lib/catalog";
import type { Message, Thread } from "@/lib/seed-inbox";
import { useDemoStore } from "@/lib/store";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { RingInviteCard, type Response } from "./RingInviteCard";

type Filter = "requests" | "messages";

const kindLabel = { ring: "Ring", swap: "Swap", join: "Join request" } as const;

function Faces({ thread, size }: { thread: Thread; size: number }) {
  if (thread.people.length === 1) return <Avatar person={thread.people[0]} size={size} />;
  // Two faces side by side with a slight overlap, so both sets of initials stay readable.
  const small = Math.round(size * 0.72);
  return (
    <span className="flex shrink-0 items-center" style={{ width: size + small * 0.45 }}>
      <Avatar person={thread.people[0]} size={small} />
      <span className="-ml-2 rounded-full border-2 border-white">
        <Avatar person={thread.people[1]} size={small} />
      </span>
    </span>
  );
}

function FilterToggle({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Show">
      {(["requests", "messages"] as const).map((f) => (
        <button
          key={f}
          aria-pressed={value === f}
          onClick={() => onChange(f)}
          className={cn(
            "h-9 rounded-md px-3 text-sm font-semibold transition-colors",
            value === f ? "bg-ink text-white" : "text-muted-ink hover:text-ink",
          )}
        >
          {f === "requests" ? "Requests" : "Messages"}
        </button>
      ))}
    </div>
  );
}

function threadTitle(t: Thread) {
  if (t.kind === "ring") return `3-way ring with ${t.name}`;
  if (t.kind === "swap") return `Swap with ${t.name}`;
  return `${t.name} wants to join ${getProject(t.links[0].projectId)?.title ?? ""}`;
}

export function InboxView({ threads }: { threads: Thread[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramId = params.get("thread");
  const { responses, respond } = useDemoStore();

  const [filter, setFilter] = useState<Filter>("requests");
  const [opened, setOpened] = useState<Set<string>>(() => new Set(paramId ? [paramId] : []));
  const [chats, setChats] = useState<Record<string, Message[]>>(() => Object.fromEntries(threads.map((t) => [t.id, t.messages])));
  const [draft, setDraft] = useState("");

  const selected = threads.find((t) => t.id === paramId);
  // Desktop always shows a thread; mobile shows the list until one is picked.
  const current = selected ?? threads[0];
  const shown = filter === "requests" ? threads : threads.filter((t) => chats[t.id].length > 0);
  const responseOf = (t: Thread): Response => responses[t.id] ?? "pending";

  function open(t: Thread) {
    setOpened((s) => new Set(s).add(t.id));
    setDraft("");
    router.replace(`${pathname}?thread=${t.id}`, { scroll: false });
  }

  function onRespond(t: Thread, r: Exclude<Response, "pending">) {
    respond(t.id, r);
    if (r === "accepted") toast.success(t.kind === "join" ? `${t.name} joined` : `${kindLabel[t.kind]} accepted`);
    else toast(`Declined`);
  }

  function send(e: React.FormEvent, t: Thread) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setChats((c) => ({ ...c, [t.id]: [...c[t.id], { from: "me", text }] }));
    setDraft("");
  }

  const list = (
    <ul className="divide-y divide-line">
      {shown.map((t) => {
        const active = t.id === current?.id;
        const unread = !opened.has(t.id) && responseOf(t) === "pending";
        const last = chats[t.id].at(-1);
        const r = responseOf(t);
        return (
          <li key={t.id}>
            <button
              onClick={() => open(t)}
              aria-current={active ? "true" : undefined}
              className={cn("flex w-full gap-3 px-4 py-3.5 text-left transition-colors lg:px-5", active ? "lg:bg-sunken" : "hover:bg-sunken/60")}
            >
              <Faces thread={t} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("min-w-0 flex-1 truncate text-[15px]", unread ? "font-bold" : "font-semibold")}>{t.name}</p>
                  <time className="font-mono text-[11px] text-muted-ink">{t.time}</time>
                  {unread && <span className="size-2 rounded-full bg-teal" aria-label="Unread" />}
                </div>
                <p className={cn("truncate text-sm", unread ? "text-ink" : "text-muted-ink")}>
                  {filter === "messages" && last ? `${last.from === "me" ? "You: " : ""}${last.text}` : t.summary}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    r === "accepted" ? "text-teal" : r === "declined" ? "text-muted-ink" : t.kind === "join" ? "text-muted-ink" : "text-teal",
                  )}
                >
                  {kindLabel[t.kind]}
                  {r !== "pending" && ` · ${r}`}
                </p>
              </div>
            </button>
          </li>
        );
      })}
      {shown.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted-ink">No conversations yet.</li>}
    </ul>
  );

  const pane = (t: Thread) => (
    <>
      <RingInviteCard thread={t} response={responseOf(t)} onRespond={(r) => onRespond(t, r)} />
      <div className="flex flex-col gap-2 pt-1">
        {chats[t.id].length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-ink">No messages yet. Say hi to {t.name}.</p>
        ) : (
          chats[t.id].map((m, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[15px] leading-snug",
                m.from === "me" ? "self-end bg-ink text-white" : "self-start bg-sunken text-ink",
              )}
            >
              {m.text}
            </p>
          ))
        )}
      </div>
      <form onSubmit={(e) => send(e, t)} className="flex gap-2 max-lg:sticky max-lg:bottom-16 max-lg:-mx-4 max-lg:border-t max-lg:border-line max-lg:bg-white max-lg:p-3">
        <label className="sr-only" htmlFor={`msg-${t.id}`}>
          Message {t.name}
        </label>
        <input
          id={`msg-${t.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${t.name}`}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3.5 text-[15px] outline-none placeholder:text-muted-ink focus:border-ink"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send" className={cn(btn.primary, "h-11 w-11 px-0")}>
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Mobile: list, or one thread with a back button */}
      <div className="lg:hidden">
        {selected ? (
          <>
            <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-white px-2">
              <button
                aria-label="Back to inbox"
                onClick={() => router.replace(pathname, { scroll: false })}
                className="flex size-11 items-center justify-center"
              >
                <ChevronLeft className="size-6" />
              </button>
              <Faces thread={selected} size={32} />
              <h1 className="min-w-0 flex-1 truncate text-base font-bold">{threadTitle(selected)}</h1>
            </header>
            <section className="flex flex-col gap-4 px-4 pt-4">{pane(selected)}</section>
          </>
        ) : (
          <>
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4">
              <h1 className="text-xl font-extrabold tracking-tight">Inbox</h1>
              <FilterToggle value={filter} onChange={setFilter} />
            </header>
            {list}
          </>
        )}
      </div>

      {/* Desktop: thread list and selected thread */}
      <div className="hidden min-h-dvh lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-r border-line">
          <div className="flex items-center justify-between px-5 pb-4 pt-7">
            <h1 className="text-2xl font-extrabold tracking-tight">Inbox</h1>
            <FilterToggle value={filter} onChange={setFilter} />
          </div>
          <div className="border-t border-line">{list}</div>
        </aside>

        {current && (
          <section className="flex max-w-[680px] flex-col gap-4 px-10 py-7" aria-label={threadTitle(current)}>
            <header className="flex items-center gap-3">
              <Faces thread={current} size={44} />
              <div>
                <h2 className="text-lg font-bold">{threadTitle(current)}</h2>
                <Label>{current.time} ago</Label>
              </div>
            </header>
            {pane(current)}
          </section>
        )}
      </div>
    </>
  );
}
