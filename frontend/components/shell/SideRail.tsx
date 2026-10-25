"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { TOLKEN } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AlertsBadge, MessagesBadge, RequestsBadge } from "./InboxBadge";
import { Logo, NodalMark } from "./Logo";
import { NavPending } from "./NavPending";
import { isActive, navItems, type NavBadgeKind } from "./nav";

const linkClass =
  "group relative flex min-h-11 items-center gap-3.5 rounded-xl px-3 text-[15px] text-ink transition-colors";

function renderBadge(kind?: NavBadgeKind, collapsed?: boolean) {
  if (!kind) return null;
  if (kind === "requests") {
    return collapsed ? (
      <RequestsBadge className="absolute -right-2.5 -top-2.5 size-4 p-0 text-[9px]" />
    ) : (
      <RequestsBadge />
    );
  }
  if (kind === "messages") {
    return collapsed ? (
      <MessagesBadge className="absolute -right-2.5 -top-2.5 size-4 p-0 text-[9px]" />
    ) : (
      <MessagesBadge />
    );
  }
  if (kind === "alerts") {
    return collapsed ? (
      <AlertsBadge className="absolute -right-1 -top-1" />
    ) : (
      <AlertsBadge />
    );
  }
  return null;
}

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
        collapsed ? "w-[76px] items-center px-2 py-5" : "w-60 px-3 py-6",
      )}
    >
      <Link href="/feed" aria-label="Nodal home" className={cn("rounded-lg", collapsed ? "mb-5" : "mb-5 px-3")}>
        {collapsed ? <NodalMark className="size-7" /> : <Logo />}
      </Link>

      <div className="flex flex-col gap-0.5 w-full">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
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
                {collapsed && renderBadge(badge, true)}
              </span>
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && renderBadge(badge, false)}
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
      </div>

      {/* Tolken Wallet Badge in Sidebar */}
      {signedIn && me && (
        <Link
          href="/u/me?tab=tolken"
          aria-label={`Tolken wallet: ${me.tolken_balance.toLocaleString()} available`}
          className={cn(
            "group relative mt-auto mb-2 flex items-center rounded-xl border border-line bg-sunken/40 transition-all hover:bg-sunken hover:border-teal/40",
            collapsed ? "size-11 justify-center p-0" : "w-full gap-2.5 px-3 py-2",
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-teal text-white text-xs font-black shadow-2xs">
            {TOLKEN}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-none">
              <p className="text-[10px] font-bold text-muted-ink uppercase tracking-wider">Tolken</p>
              <p className="mt-0.5 truncate text-xs font-black text-ink group-hover:text-teal transition-colors">
                {me.tolken_balance.toLocaleString()}
              </p>
            </div>
          )}
          {collapsed && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-[calc(100%+8px)] z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              {TOLKEN} {me.tolken_balance.toLocaleString()} Tolken
            </span>
          )}
        </Link>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={toggleLabel}
        aria-pressed={collapsed}
        title={collapsed ? toggleLabel : undefined}
        className={cn(
          linkClass,
          !signedIn && "mt-auto",
          "w-full cursor-pointer font-medium text-muted-ink hover:bg-sunken hover:text-ink",
          collapsed && "w-11 justify-center gap-0 px-0",
        )}
      >
        {collapsed ? <PanelLeftOpen className="size-[22px]" strokeWidth={1.75} /> : <PanelLeftClose className="size-[22px]" strokeWidth={1.75} />}
        {!collapsed && <span className="flex-1 text-left">Collapse</span>}
      </button>
    </nav>
  );
}
