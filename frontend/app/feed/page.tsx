import Link from "next/link";
import { Send, SquarePlus } from "lucide-react";
import { Composer } from "@/components/feed/Composer";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { SideSuggestions } from "@/components/feed/SideSuggestions";
import { StoryRow } from "@/components/feed/StoryRow";
import { InboxBadge } from "@/components/shell/InboxBadge";
import { Logo } from "@/components/shell/Logo";
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

      <div className="mx-auto w-full max-w-[1040px] lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,600px)_300px] lg:justify-center lg:gap-10">
          <div className="min-w-0">
            <div className="hidden pb-4 pt-7 lg:block">
              <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Home</h1>
              <p className="mt-0.5 text-[13px] text-muted-ink">What people are building right now</p>
            </div>

            <OnboardingPrompt />
            <Composer />
            <StoryRow />
            <div className="mt-2 lg:mt-4">
              <FeedTabs />
            </div>
          </div>
          <SideSuggestions />
        </div>
      </div>
    </>
  );
}
