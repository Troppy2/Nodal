"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { InboxBadge } from "./InboxBadge";
import { Logo } from "./Logo";
import { NavPending } from "./NavPending";
import { isActive, navItems } from "./nav";

const linkClass = "relative flex min-h-11 items-center gap-3.5 rounded-xl px-3 text-[15px] text-ink transition-colors";

export function SideRail() {
  const pathname = usePathname();
  const { me, ready, signedIn } = useSession();
  return (
    <nav aria-label="Main" className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 border-r border-line bg-white px-3 py-7 lg:flex">
      <Link href="/feed" className="mb-7 rounded-lg px-3">
        <Logo />
      </Link>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        // Profile needs a signed-in viewer; visitors get a Sign in link in its place.
        if (!Icon && ready && !signedIn) {
          return (
            <Link key="signin" href="/" className={cn(linkClass, "font-medium hover:bg-sunken")}>
              <LogIn className="size-[22px]" strokeWidth={1.75} />
              <span className="flex-1">Sign in</span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(linkClass, active ? "bg-sunken font-bold" : "font-medium hover:bg-sunken")}
          >
            {Icon ? (
              <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
            ) : me ? (
              <Avatar person={me.profile} size={22} className="text-[8px]!" />
            ) : (
              <span className="size-[22px] rounded-full bg-sunken" aria-hidden />
            )}
            <span className="flex-1">{label}</span>
            {href === "/inbox" && <InboxBadge />}
            <NavPending className="left-0 top-1/2 h-5 w-[3px] -translate-y-1/2" />
          </Link>
        );
      })}
    </nav>
  );
}
