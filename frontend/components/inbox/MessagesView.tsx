"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/checks/States";
import type { ConversationOut } from "@/lib/api-types";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ConversationRow, MessageThread } from "./Messages";

export function MessagesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { ready, signedIn } = useSession();

  const conversations = useApi<ConversationOut[]>(signedIn ? "/me/conversations" : null);

  const rawThread = params.get("thread") || params.get("to");
  const selectedProfileId = rawThread?.startsWith("m:") ? rawThread.slice(2) : rawThread;

  const select = (profileId: string | null) => {
    router.replace(profileId ? `${pathname}?thread=m:${profileId}` : pathname, { scroll: false });
  };

  if (ready && !signedIn) {
    return (
      <EmptyState
        title="Sign in to view your messages"
        body="Direct messages and project invitations land here."
        action={
          <Link href="/" className={btn.primary}>
            Sign in
          </Link>
        }
        className="py-24"
      />
    );
  }

  const convos = conversations.data ?? [];
  const unreadTotal = convos.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[380px_minmax(0,1fr)] lg:overflow-hidden bg-white">
      {/* Conversations sidebar */}
      <aside
        className={cn(
          "border-line lg:border-r lg:flex lg:flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden bg-white",
          selectedProfileId && "max-lg:hidden",
        )}
      >
        <header className="shrink-0 flex items-center justify-between border-b border-line px-5 py-4 bg-white">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink">Messages</h1>
            <p className="text-xs text-muted-ink mt-0.5">Private conversations and project DMs</p>
          </div>
          {unreadTotal > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-teal-tint px-2.5 py-1 text-xs font-bold text-teal border border-teal/20">
              <span className="size-2 rounded-full bg-teal" />
              {unreadTotal} unread
            </span>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {conversations.error ? (
            <ErrorState error={conversations.error} onRetry={conversations.reload} />
          ) : !conversations.data ? (
            <RowsSkeleton rows={4} className="px-5 py-3" />
          ) : convos.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No messages yet"
                body="Invite someone to your project from 'People who fit', or message a person from their profile."
                action={
                  <Link href="/explore" className={btn.secondary}>
                    Explore creators & projects
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {convos.map((c) => (
                <ConversationRow
                  key={c.profile.id}
                  item={c}
                  active={c.profile.id === selectedProfileId}
                  onOpen={() => select(c.profile.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Message thread details */}
      <section
        className={cn(
          "flex flex-col min-h-0 lg:h-dvh lg:overflow-hidden bg-white",
          selectedProfileId
            ? "max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:h-dvh"
            : "max-lg:hidden",
        )}
        aria-live="polite"
      >
        {selectedProfileId ? (
          <MessageThread profileId={selectedProfileId} onBack={() => select(null)} />
        ) : (
          <div className="hidden h-full items-center justify-center p-8 lg:flex">
            <div className="max-w-md text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sunken border border-line mb-3 text-teal">
                <MessageSquare className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-ink">Your conversations</h3>
              <p className="mt-1 text-sm text-muted-ink leading-relaxed">
                Select a conversation on the left to read messages, accept invitations, or send follow-ups.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

