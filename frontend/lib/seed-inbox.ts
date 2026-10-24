// Static Inbox demo data until GET /me/inbox is wired. Matches the swap and ring in lib/catalog.ts.
import { me, people } from "./catalog";
import type { Person } from "./types";

/** One link of a swap or ring: `who` fills `skill` on `projectId`. */
export interface InviteLink {
  who: Person;
  skill: string;
  projectId: string;
}

export interface Message {
  from: "me" | "them";
  text: string;
}

export interface Thread {
  id: string;
  kind: "ring" | "swap" | "join";
  /** The other people in the thread. */
  people: Person[];
  name: string;
  summary: string;
  time: string;
  links: InviteLink[];
  /** Responses already in, by handle. The viewer's own response comes from the store. */
  responded: Record<string, "accepted">;
  /** For join requests: the requester's note. */
  note?: string;
  /** Project whose team you land on after accepting. */
  teamProjectId?: string;
  messages: Message[];
}

export const threads: Thread[] = [
  {
    id: "ring-dev-rin",
    kind: "ring",
    people: [people.dev, people.rin],
    name: "Dev and Rin",
    summary: "Invited you to a 3-way ring",
    time: "1h",
    links: [
      { who: me, skill: "UI design", projectId: "dungeon-drift" },
      { who: people.dev, skill: "Sound design", projectId: "paper-orbit" },
      { who: people.rin, skill: "Generative art", projectId: "soil-choir" },
    ],
    responded: { dev: "accepted" },
    teamProjectId: "soil-choir",
    messages: [
      { from: "them", text: "We both need each other's skills. Want to do a quick call to plan the split?" },
      { from: "me", text: "Yes. I'll accept the ring first, then we can set shares." },
    ],
  },
  {
    id: "swap-maya",
    kind: "swap",
    people: [people.maya],
    name: "Maya",
    summary: "Firmware for Soil Choir, UI for her plant monitor",
    time: "3h",
    links: [
      { who: people.maya, skill: "ESP32 firmware", projectId: "soil-choir" },
      { who: me, skill: "UI design", projectId: "plant-monitor" },
    ],
    responded: { maya: "accepted" },
    teamProjectId: "soil-choir",
    messages: [{ from: "them", text: "Your Soil Choir needs firmware and my plant monitor app needs a UI. Swap?" }],
  },
  {
    id: "join-leila",
    kind: "join",
    people: [people.leila],
    name: "Leila",
    summary: "Wants to join Gopher Planner as Mobile app",
    time: "1d",
    links: [{ who: people.leila, skill: "Mobile app", projectId: "gopher-planner" }],
    responded: {},
    note: "I've shipped two React Native apps. I could have a shell of the planner running this weekend.",
    messages: [],
  },
];
