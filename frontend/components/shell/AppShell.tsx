"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SideRail } from "./SideRail";
import { TabBar } from "./TabBar";
import { cn } from "@/lib/utils";

/** The landing page, onboarding and login are full-screen: no rail, no tab bar. */
const chromeFree = new Set(["/", "/onboarding", "/login"]);
const RAIL_KEY = "nodal-rail";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Remember the rail width across visits; the server always renders it expanded.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(RAIL_KEY) === "collapsed");
  }, []);

  function toggleRail() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(RAIL_KEY, next ? "collapsed" : "expanded");
      return next;
    });
  }

  if (chromeFree.has(pathname)) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <SideRail collapsed={collapsed} onToggle={toggleRail} />
      <main className={cn("pb-20 transition-[padding] duration-200 lg:pb-0", collapsed ? "lg:pl-[76px]" : "lg:pl-60")}>
        {children}
      </main>
      <TabBar />
    </div>
  );
}
