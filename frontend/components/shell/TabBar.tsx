"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { me } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { isActive, navItems } from "./nav";

// Same five destinations as the rail; Home, Explore, Create, Inbox, Profile in thumb order.
const order = ["/feed", "/explore", "/create", "/inbox", "/u/me"];

export function TabBar() {
  const pathname = usePathname();
  const items = order.map((href) => navItems.find((n) => n.href === href)!);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className="flex h-11 min-w-11 items-center justify-center"
          >
            {href === "/create" ? (
              <span className="flex h-9 w-12 items-center justify-center rounded-xl bg-ink text-white">
                <Plus className="size-5" strokeWidth={2.5} />
              </span>
            ) : Icon ? (
              <Icon className={cn("size-6", active ? "text-ink" : "text-muted-ink")} strokeWidth={active ? 2.5 : 1.75} />
            ) : (
              <span className={cn("rounded-full p-0.5", active && "ring-2 ring-ink")}>
                <Avatar person={me} size={28} />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
