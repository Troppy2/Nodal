"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { InboxBadge } from "./InboxBadge";
import { Logo, NodalMark } from "./Logo";
import { NavPending } from "./NavPending";
import { isActive, navItems } from "./nav";

const linkClass =
  "group relative flex min-h-11 items-center gap-3.5 rounded-xl px-3 text-[15px] text-ink transition-colors";

/** Desktop rail. Collapsed it is icons only, with the label on hover; the choice is stored by AppShell. */
export function SideRail({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { me, ready, signedIn } = useSession();
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-white transition-[width,padding] duration-200 lg:flex",
        collapsed ? "w-[76px] items-center px-2 py-5" : "w-60 px-3 py-7",
      )}
    >
      <Link href="/feed" aria-label="Nodal home" className={cn("rounded-lg", collapsed ? "mb-6" : "mb-7 px-3")}>
        {collapsed ? <NodalMark className="size-7" /> : <Logo />}
      </Link>

      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const content = (
          <>
            <span className="relative flex shrink-0 items-center justify-center">
              {Icon ? (
                <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
              ) : me ? (
                <Avatar person={me.profile} size={22} className="text-[8px]!" />
              ) : (
                <span className="size-[22px] rounded-full bg-sunken" aria-hidden />
              )}
              {href === "/inbox" && collapsed && (
                <InboxBadge className="absolute -right-2.5 -top-2.5 size-4 p-0 text-[9px]" />
              )}
            </span>
            {!collapsed && <span className="flex-1">{label}</span>}
            {!collapsed && href === "/inbox" && <InboxBadge />}
          </>
        );
        const className = cn(
          linkClass,
          collapsed && "w-11 justify-center gap-0 px-0",
          active ? "bg-sunken font-bold" : "font-medium hover:bg-sunken",
        );
        const tip = collapsed && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {label}
          </span>
        );

        // Visitors get Sign in where Profile would be.
        if (!Icon && ready && !signedIn) {
          return (
            <Link
              key="signin"
              href="/"
              aria-label="Sign in"
              className={cn(linkClass, "font-medium hover:bg-sunken", collapsed && "w-11 justify-center gap-0 px-0")}
            >
              <span className="relative flex shrink-0 items-center justify-center">
                <LogIn className="size-[22px]" strokeWidth={1.75} />
              </span>
              {!collapsed && <span className="flex-1">Sign in</span>}
              {tip}
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? label : undefined}
            className={className}
          >
            {content}
            {tip}
            <NavPending className={cn(collapsed ? "bottom-1 left-1/2 w-3 -translate-x-1/2" : "left-0 top-1/2 h-5 w-[3px] -translate-y-1/2")} />
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onToggle}
        aria-label={toggleLabel}
        aria-pressed={collapsed}
        title={collapsed ? toggleLabel : undefined}
        className={cn(
          linkClass,
          "mt-auto w-full cursor-pointer font-medium text-muted-ink hover:bg-sunken hover:text-ink",
          collapsed && "w-11 justify-center gap-0 px-0",
        )}
      >
        {collapsed ? <PanelLeftOpen className="size-[22px]" strokeWidth={1.75} /> : <PanelLeftClose className="size-[22px]" strokeWidth={1.75} />}
        {!collapsed && <span className="flex-1 text-left">Collapse</span>}
      </button>
    </nav>
  );
}
