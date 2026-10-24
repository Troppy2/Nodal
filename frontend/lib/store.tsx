"use client";

// Client-side demo state so actions stick while you move between screens.
// Replaced by API calls (stars, follows, collab requests, bounties, comments) once the backend is wired.
import { createContext, useContext, useEffect, useState } from "react";
import { offers, type Comment } from "./catalog";

interface DemoState {
  starred: Set<string>;
  following: Set<string>;
  saved: Set<string>;
  /** `${projectId}:${skill}` for each collab request the viewer sent. */
  requested: Set<string>;
  invited: Set<string>;
  /** `${projectId}:${skill}` for each bounty the viewer funded with Tolken. */
  funded: Set<string>;
  /** Tolken balance. The in-app currency; there is no money in Nodal. */
  tolken: number;
  /** Set once the onboarding wizard is finished. */
  onboarded: boolean;
  mySkills: string[];
  interests: string[];
  /** Inbox thread id -> response. */
  responses: Record<string, "accepted" | "declined">;
  comments: Record<string, Comment[]>;
}

interface DemoStore extends DemoState {
  toggle: (key: "starred" | "following" | "saved", id: string) => void;
  add: (key: "requested" | "invited", id: string) => void;
  /** Move Tolken from the viewer's balance to a bounty. */
  fund: (projectId: string, skill: string, amount: number) => void;
  completeOnboarding: (profile: { skills: string[]; interests: string[] }) => void;
  respond: (threadId: string, response: "accepted" | "declined") => void;
  addComment: (projectId: string, comment: Comment) => void;
}

const Ctx = createContext<DemoStore | null>(null);

const ONBOARDED_KEY = "nodal:onboarded";

/** True once this browser has finished onboarding. Safe to call when storage is blocked. */
export function hasOnboarded() {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>({
    starred: new Set(["plant-monitor", "tide-prints", "loop-garden"]),
    following: new Set(["maya", "rin"]),
    saved: new Set(),
    requested: new Set(),
    invited: new Set(),
    funded: new Set(),
    tolken: 120,
    onboarded: false,
    mySkills: offers.inah.map((o) => o.skill),
    interests: ["sensor-data", "music", "edtech"],
    responses: {},
    comments: {},
  });

  // Remember a finished onboarding across reloads so sign-in can skip it next time.
  useEffect(() => {
    if (hasOnboarded()) setState((s) => ({ ...s, onboarded: true }));
  }, []);

  const store: DemoStore = {
    ...state,
    toggle: (key, id) =>
      setState((s) => {
        const next = new Set(s[key]);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ...s, [key]: next };
      }),
    add: (key, id) => setState((s) => ({ ...s, [key]: new Set(s[key]).add(id) })),
    fund: (projectId, skill, amount) =>
      setState((s) => {
        const key = `${projectId}:${skill}`;
        if (s.funded.has(key) || s.tolken < amount) return s;
        return { ...s, tolken: s.tolken - amount, funded: new Set(s.funded).add(key) };
      }),
    completeOnboarding: ({ skills, interests }) => {
      try {
        localStorage.setItem(ONBOARDED_KEY, "1");
      } catch {}
      setState((s) => ({ ...s, mySkills: skills, interests, onboarded: true }));
    },
    respond: (threadId, response) => setState((s) => ({ ...s, responses: { ...s.responses, [threadId]: response } })),
    addComment: (projectId, comment) =>
      setState((s) => ({ ...s, comments: { ...s.comments, [projectId]: [...(s.comments[projectId] ?? []), comment] } })),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useDemoStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return store;
}
