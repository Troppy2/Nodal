"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MessagesBadge, RequestsBadge } from "./InboxBadge";
import { isActive, navItems } from "./nav";
import { NavPending } from "./NavPending";

const order = ["/feed", "/explore", "/my-projects", "/requests", "/messages", "/u/me"];

export function TabBar() {
  const pathname = usePathname();
  const { me, ready, signedIn } = useSession();
  const items = order
    .map((href) => navItems.find((n) => n.href === href))
    .filter(Boolean) as (typeof navItems)[number][];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = isActive(pathname, href);
        if (!Icon && ready && !signedIn) {
          return (
            <Link
              key="signin"
              href="/"
              aria-label="Sign in"
              className="flex h-11 min-w-10 items-center justify-center rounded-lg text-muted-ink transition-colors hover:text-ink active:bg-sunken"
            >
              <LogIn className="size-5 sm:size-6" strokeWidth={1.75} />
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className="relative flex h-11 min-w-10 items-center justify-center rounded-lg transition-colors hover:bg-sunken active:bg-sunken px-1"
          >
            <span className="relative flex shrink-0 items-center justify-center">
              {Icon ? (
                <Icon className={cn("size-[22px] sm:size-6", active ? "text-ink" : "text-muted-ink")} strokeWidth={active ? 2.5 : 1.75} />
              ) : (
                <span className={cn("rounded-full p-0.5", active && "ring-2 ring-ink")}>
                  {me ? <Avatar person={me.profile} size={24} /> : <span className="block size-6 rounded-full bg-sunken" />}
                </span>
              )}
              {badge === "requests" && (
                <RequestsBadge className="absolute -right-2 -top-2 size-4 p-0 text-[9px]" />
              )}
              {badge === "messages" && (
                <MessagesBadge className="absolute -right-2 -top-2 size-4 p-0 text-[9px]" />
              )}
            </span>
            <NavPending className="-bottom-1 left-1/2 w-5 -translate-x-1/2" />
          </Link>
        );
      })}
    </nav>
  );
}
