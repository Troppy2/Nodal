"use client";

import Link from "next/link";
import { PencilLine } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** The one obvious way into posting, at the top of the feed where people look for it. */
export function Composer() {
  const { me, signedIn } = useSession();
  const href = signedIn ? "/create" : "/";
  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 lg:mx-0 lg:mt-0">
      {me ? (
        <Avatar person={me.profile} size={36} />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-muted-ink" aria-hidden>
          <PencilLine className="size-4" />
        </span>
      )}
      <Link
        href={href}
        className="flex h-10 min-w-0 flex-1 items-center rounded-lg bg-sunken px-3.5 text-sm text-muted-ink transition-colors hover:bg-line/70 hover:text-ink"
      >
        {signedIn ? "Share an idea or a project…" : "Sign in to post an idea"}
      </Link>
      <Link href={href} className={cn(btn.primary, "h-10 max-sm:hidden")}>
        {signedIn ? "New post" : "Sign in"}
      </Link>
    </div>
  );
}
