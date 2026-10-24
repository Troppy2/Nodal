"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { me } from "@/lib/catalog";
import { InboxBadge } from "./InboxBadge";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { NavPending } from "./NavPending";
import { isActive, navItems } from "./nav";

export function SideRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 border-r border-line bg-white px-3 py-7 lg:flex">
      <Link href="/feed" className="mb-7 px-3">
        <Logo />
      </Link>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3.5 rounded-xl px-3 text-[15px] text-ink transition-colors",
              active ? "bg-sunken font-bold" : "font-medium hover:bg-sunken",
            )}
          >
            {Icon ? (
              <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
            ) : (
              <Avatar person={me} size={22} className="text-[8px]!" />
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
