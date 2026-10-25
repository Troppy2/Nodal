import { Bell, FolderGit2, Home, Inbox, MessageSquare, Search, SquarePlus, type LucideIcon } from "lucide-react";

export type NavBadgeKind = "requests" | "messages" | "alerts";

export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: NavBadgeKind;
};

// Profile renders the viewer's avatar instead of an icon.
export const navItems: NavItem[] = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/my-projects", label: "Projects", icon: FolderGit2 },
  { href: "/requests", label: "Requests", icon: Inbox, badge: "requests" },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: "messages" },
  { href: "/alerts", label: "Alerts", icon: Bell, badge: "alerts" },
  { href: "/create", label: "Create", icon: SquarePlus },
  { href: "/u/me", label: "Profile" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/u/me") return pathname.startsWith("/u/");
  if (href === "/my-projects") return pathname === "/my-projects" || pathname.startsWith("/my-projects/");
  if (href === "/requests") return pathname === "/requests" || pathname.startsWith("/requests/") || (pathname.startsWith("/inbox") && !pathname.includes("thread=m:"));
  if (href === "/messages") return pathname === "/messages" || pathname.startsWith("/messages/");
  if (href === "/alerts") return pathname === "/alerts" || pathname.startsWith("/alerts/");
  return pathname.startsWith(href);
}
