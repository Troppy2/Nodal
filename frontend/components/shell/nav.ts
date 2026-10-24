import { Home, Search, Send, SquarePlus, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon?: LucideIcon };

// Profile renders the viewer's avatar instead of an icon.
export const navItems: NavItem[] = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Send },
  { href: "/create", label: "Create", icon: SquarePlus },
  { href: "/u/me", label: "Profile" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/u/me") return pathname.startsWith("/u/");
  return pathname.startsWith(href);
}
