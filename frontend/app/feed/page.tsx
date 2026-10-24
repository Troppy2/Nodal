import Link from "next/link";
import { Send, SquarePlus } from "lucide-react";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { SideSuggestions } from "@/components/feed/SideSuggestions";
import { StoryRow } from "@/components/feed/StoryRow";
import { Logo } from "@/components/shell/Logo";
import { InboxBadge } from "@/components/shell/InboxBadge";
import { OnboardingPrompt } from "@/components/shell/OnboardingPrompt";

export default function FeedPage() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center">
          <Link href="/create" aria-label="Create" className="flex size-11 items-center justify-center">
            <SquarePlus className="size-6" strokeWidth={1.75} />
          </Link>
          <Link href="/inbox" aria-label="Inbox" className="relative flex size-11 items-center justify-center">
            <Send className="size-6" strokeWidth={1.75} />
            <InboxBadge className="absolute right-0.5 top-0.5" />
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1000px] justify-center gap-12 lg:px-6 lg:py-4">
        <div className="w-full min-w-0 max-w-[580px]">
          <OnboardingPrompt />
          <StoryRow />
          <FeedTabs />
        </div>
        <SideSuggestions />
      </div>
    </>
  );
}
