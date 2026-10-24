"use client";

import { usePathname } from "next/navigation";
import { SideRail } from "./SideRail";
import { TabBar } from "./TabBar";

/** The landing page, onboarding and login are full-screen: no rail, no tab bar. */
const chromeFree = new Set(["/", "/onboarding", "/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (chromeFree.has(pathname)) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <SideRail />
      <main className="pb-20 lg:pb-0 lg:pl-60">{children}</main>
      <TabBar />
    </div>
  );
}
