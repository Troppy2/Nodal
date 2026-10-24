// One demo catalog behind every screen until the API is wired.
// The data is shaped so the seeded stories hold together:
//   swap: Maya writes firmware for Soil Choir; Inah designs the UI for Maya's plant monitor app.
//   ring: Inah does UI for Dev's Dungeon Drift, Dev does sound for Rin's Paper Orbit,
//         Rin does generative art for Inah's Soil Choir.
import type { Cover, Person, ProjectType, Stage } from "./types";

export const people = {
  inah: { handle: "inah", name: "Inah", initials: "IN", tint: "teal" },
  maya: { handle: "maya", name: "Maya Okafor", initials: "MO", tint: "hardware" },
  dev: { handle: "dev", name: "Dev Rahman", initials: "DR", tint: "creative" },
  rin: { handle: "rin", name: "Rin Castillo", initials: "RC", tint: "creative" },
  leila: { handle: "leila", name: "Leila Karimi", initials: "LK", tint: "software" },
  tomas: { handle: "tomas", name: "Tomas Berg", initials: "TB", tint: "hardware" },
} satisfies Record<string, Person>;

export type Handle = keyof typeof people;

/** The signed-in viewer in the demo. */
export const me = people.inah;

export interface Offer {
  skill: string;
  level: 1 | 2 | 3;
}

export const offers: Record<Handle, Offer[]> = {
  inah: [
    { skill: "Python backend", level: 3 },
    { skill: "UI design", level: 2 },
    { skill: "Next.js", level: 3 },
  ],
  maya: [
    { skill: "ESP32 firmware", level: 3 },
    { skill: "PCB design", level: 2 },
  ],
  dev: [
    { skill: "Sound design", level: 3 },
    { skill: "Game dev", level: 2 },
  ],
  rin: [
    { skill: "Generative art", level: 2 },
    { skill: "Illustration", level: 3 },
  ],
  leila: [
    { skill: "UI design", level: 3 },
    { skill: "Mobile app", level: 2 },
  ],
  tomas: [
    { skill: "3D modeling", level: 2 },
    { skill: "ESP32 firmware", level: 2 },
    { skill: "PCB design", level: 3 },
  ],
};

export function offersSkill(handle: Handle, skill: string) {
  return offers[handle].some((o) => o.skill.toLowerCase() === skill.toLowerCase());
}

export interface Need {
  skill: string;
  note: string;
  /** Bounty in Tolken, the in-app currency. There is no money in Nodal. */
  bounty_tolken?: number;
}

export interface Comment {
  author: Person;
  age: string;
  body: string;
}

export interface FileRow {
  name: string;
  kind: "folder" | "file";
  message: string;
  age: string;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  type: ProjectType;
  /** Every discipline the project spans; the first is `type`. */
  disciplines: ProjectType[];
  stage: Stage;
  source: "none" | "open";
  cover: Cover;
  owner: Person;
  posted: string;
  activity: string;
  needs: Need[];
  tags: string[];
  stars: number;
  badges: { market_verdict?: string; cool_score?: number };
  comments: Comment[];
  license?: string;
  files?: FileRow[];
  languages?: { name: string; pct: number }[];
  readme?: string;
  memberHandles: Handle[];
}

const p = people;

export const projects: Project[] = [
  {
    id: "soil-choir",
    title: "Soil Choir",
    summary:
      "A soil sensor that turns your plant's moisture into generative music. Dry soil sounds sparse and tense. Watered soil blooms.",
    type: "creative",
    disciplines: ["creative", "hardware"],
    stage: "idea",
    source: "none",
    cover: { pattern: "rings", tint: "creative" },
    owner: p.inah,
    posted: "2h",
    activity: "posted an idea",
    needs: [
      { skill: "ESP32 firmware", note: "Read moisture every minute, stream it over Wi-Fi", bounty_tolken: 40 },
      { skill: "Sound design", note: "A patch that stays pleasant for hours" },
      { skill: "Generative art", note: "Visuals that bloom with the music" },
    ],
    tags: ["sensor-data", "music", "plants"],
    stars: 48,
    badges: { market_verdict: "Mixed", cool_score: 8.0 },
    comments: [
      { author: p.rin, age: "1h", body: "The dry-soil-sounds-tense idea is great. I'd draw roots that thin out as it dries." },
      { author: p.maya, age: "1h", body: "My plant monitor already streams moisture. Happy to reuse that firmware here." },
    ],
    readme: `# Soil Choir

A soil sensor that turns your plant's moisture into generative music.

## The problem

Plant sensors send alerts nobody reads. A plant you can *hear* is one you notice.

## The plan

- An ESP32 reads soil moisture every minute.
- A small synth maps dryness to tension: sparse notes when dry, full chords after watering.
- A screen draws roots that grow and thin with the readings.
`,
    memberHandles: ["inah"],
  },
  {
    id: "plant-monitor",
    title: "Plant monitor",
    summary: "Soil moisture and light sensor with a small e-ink display. v0.4 adds a battery gauge.",
    type: "hardware",
    disciplines: ["hardware"],
    stage: "building",
    source: "open",
    cover: { pattern: "bars", tint: "hardware" },
    owner: p.maya,
    posted: "5h",
    activity: "shipped an update",
    needs: [
      { skill: "ESP32 firmware", note: "Deep sleep and wake, so one battery lasts months", bounty_tolken: 50 },
      { skill: "UI design", note: "A companion app that shows a week of readings" },
    ],
    tags: ["sensor-data", "esp32", "e-ink"],
    stars: 212,
    badges: {},
    license: "MIT",
    comments: [
      { author: p.dev, age: "1d", body: "Deep sleep with a timer wakeup should get you weeks. Happy to pair on it." },
      { author: p.leila, age: "2d", body: "Love the e-ink status words. Could the readings feed a dashboard?" },
    ],
    files: [
      { name: "firmware", kind: "folder", message: "Add battery gauge to e-ink display", age: "2h" },
      { name: "hardware", kind: "folder", message: "PCB rev B, smaller footprint", age: "3d" },
      { name: "docs", kind: "folder", message: "Wiring guide with photos", age: "1w" },
      { name: "platformio.ini", kind: "file", message: "Pin ESP32 board version", age: "2w" },
      { name: "README.md", kind: "file", message: "Describe the sensor and display", age: "2w" },
    ],
    languages: [
      { name: "C++", pct: 62 },
      { name: "Python", pct: 28 },
      { name: "KiCad", pct: 10 },
    ],
    readme: `# Plant monitor

A small soil moisture and light sensor with an e-ink display that shows how your plant is doing at a glance.

## What it does

- Reads soil moisture and light every ten minutes.
- Shows a plain-language status on the display: thirsty, fine, or too dark.
- Sends readings over Wi-Fi so other projects can use them.

## What it needs

Firmware for sleep and wake. The current prototype drains the battery in days.
`,
    memberHandles: ["maya", "dev", "leila", "tomas"],
  },
  {
    id: "dungeon-drift",
    title: "Dungeon Drift",
    summary: "A drifting roguelike where every floor is a race track. Open source while the menus get rebuilt.",
    type: "software",
    disciplines: ["software", "creative"],
    stage: "shipped",
    source: "open",
    cover: { pattern: "blocks", tint: "software" },
    owner: p.dev,
    posted: "1d",
    activity: "shipped an update",
    needs: [
      { skill: "UI design", note: "Menus and a run-summary screen that read at a glance" },
      { skill: "3D modeling", note: "Low-poly karts, about 12 tris per wheel" },
    ],
    tags: ["game", "roguelike", "godot"],
    stars: 87,
    badges: {},
    license: "Proprietary",
    comments: [{ author: p.tomas, age: "6h", body: "Low-poly karts sound fun. What's the poly budget per kart?" }],
    files: [
      { name: "scenes", kind: "folder", message: "Floor 4 drift track", age: "1d" },
      { name: "scripts", kind: "folder", message: "Tighter drift physics", age: "1d" },
      { name: "audio", kind: "folder", message: "Engine loops", age: "4d" },
      { name: "project.godot", kind: "file", message: "Bump to Godot 4.3", age: "1w" },
      { name: "README.md", kind: "file", message: "Controls and build notes", age: "2w" },
    ],
    languages: [
      { name: "GDScript", pct: 81 },
      { name: "GLSL", pct: 19 },
    ],
    readme: `# Dungeon Drift

Every floor of the dungeon is a track. Drift through corners to charge your attacks.
`,
    memberHandles: ["dev", "rin"],
  },
  {
    id: "paper-orbit",
    title: "Paper Orbit",
    summary: "Cut-paper planets that orbit when you blow on a microphone. Needs a soundscape that reacts to breath.",
    type: "creative",
    disciplines: ["creative"],
    stage: "building",
    source: "open",
    cover: { pattern: "dots", tint: "creative" },
    owner: p.rin,
    posted: "8h",
    activity: "posted progress",
    needs: [{ skill: "Sound design", note: "Wind and chime layers driven by mic level" }],
    tags: ["installation", "audio-reactive"],
    stars: 21,
    badges: {},
    comments: [],
    memberHandles: ["rin"],
  },
  {
    id: "study-quest",
    title: "Study Quest",
    summary: "Turn a study plan into a tiny RPG: finished chapters unlock dungeon floors.",
    type: "software",
    disciplines: ["software", "creative"],
    stage: "idea",
    source: "none",
    cover: { pattern: "dots", tint: "software" },
    owner: p.leila,
    posted: "1d",
    activity: "posted an idea",
    needs: [
      { skill: "Game dev", note: "A turn-based loop that fits in five minutes" },
      { skill: "Python backend", note: "Sync plans across devices" },
    ],
    tags: ["edtech", "game"],
    stars: 12,
    badges: { cool_score: 7.5 },
    comments: [],
    memberHandles: ["leila"],
  },
  {
    id: "tide-prints",
    title: "Tide Prints",
    summary: "Risograph prints generated from a year of local tide data.",
    type: "creative",
    disciplines: ["creative", "software"],
    stage: "shipped",
    source: "open",
    cover: { pattern: "stripes", tint: "creative" },
    owner: p.rin,
    posted: "3d",
    activity: "shipped",
    needs: [{ skill: "Python backend", note: "Pull live tide feeds for a monthly print run" }],
    tags: ["sensor-data", "print"],
    stars: 33,
    badges: {},
    comments: [],
    memberHandles: ["rin"],
  },
  {
    id: "gopher-planner",
    title: "Gopher Planner",
    summary: "A weekly planner that books focus blocks around your classes.",
    type: "software",
    disciplines: ["software"],
    stage: "building",
    source: "open",
    cover: { pattern: "bars", tint: "software" },
    owner: p.inah,
    posted: "4d",
    activity: "posted progress",
    needs: [{ skill: "Mobile app", note: "A React Native shell for the planner" }],
    tags: ["productivity", "students"],
    stars: 61,
    badges: {},
    comments: [],
    memberHandles: ["inah"],
  },
  {
    id: "buoy-watch",
    title: "Buoy Watch",
    summary: "A solar buoy that logs water temperature and turbidity for local swimmers.",
    type: "hardware",
    disciplines: ["hardware", "software"],
    stage: "shipped",
    source: "open",
    cover: { pattern: "blocks", tint: "hardware" },
    owner: p.tomas,
    posted: "5d",
    activity: "posted progress",
    needs: [{ skill: "Python backend", note: "An API that serves the last 24 hours of readings" }],
    tags: ["sensor-data", "solar", "ocean"],
    stars: 40,
    badges: {},
    comments: [],
    memberHandles: ["tomas"],
  },
  {
    id: "loop-garden",
    title: "Loop Garden",
    summary: "A browser sequencer where each plant you grow is a looping melody.",
    type: "creative",
    disciplines: ["creative", "software"],
    stage: "shipped",
    source: "open",
    cover: { pattern: "rings", tint: "creative" },
    owner: p.rin,
    posted: "6d",
    activity: "shipped",
    needs: [{ skill: "Sound design", note: "Twelve more instrument samples" }],
    tags: ["music", "web-audio"],
    stars: 29,
    badges: {},
    comments: [],
    memberHandles: ["rin", "dev"],
  },
  {
    id: "quiet-hours",
    title: "Quiet Hours",
    summary: "A desk lamp that dims as the room gets loud, nudging everyone to lower their voice.",
    type: "hardware",
    disciplines: ["hardware"],
    stage: "idea",
    source: "none",
    cover: { pattern: "dots", tint: "hardware" },
    owner: p.tomas,
    posted: "2d",
    activity: "posted an idea",
    needs: [
      { skill: "PCB design", note: "Mic, LED driver, and USB-C power on one board" },
      { skill: "3D modeling", note: "A printable shade" },
    ],
    tags: ["lighting", "audio-reactive"],
    stars: 9,
    badges: {},
    comments: [],
    memberHandles: ["tomas"],
  },
  {
    id: "park-and-go",
    title: "Park&Go",
    summary: "Shows which campus lots have space, from gate counters.",
    type: "software",
    disciplines: ["software"],
    stage: "shipped",
    source: "open",
    cover: { pattern: "stripes", tint: "software" },
    owner: p.inah,
    posted: "2w",
    activity: "shipped",
    needs: [],
    tags: ["campus", "maps"],
    stars: 37,
    badges: {},
    comments: [],
    memberHandles: ["inah"],
  },
  {
    id: "signal-lamp",
    title: "Signal Lamp",
    summary: "Two lamps in two homes. Tap one and the other glows.",
    type: "hardware",
    disciplines: ["hardware", "creative"],
    stage: "shipped",
    source: "open",
    cover: { pattern: "bars", tint: "hardware" },
    owner: p.maya,
    posted: "1w",
    activity: "shipped",
    needs: [{ skill: "Generative art", note: "Glow patterns that feel like a heartbeat" }],
    tags: ["iot", "gift"],
    stars: 18,
    badges: {},
    comments: [],
    memberHandles: ["maya"],
  },
];

export function getProject(id: string) {
  return projects.find((x) => x.id === id);
}

/** People who offer a skill, excluding the project's owner. Viewer first when they fit. */
export function fittersFor(project: Project, skill: string): Person[] {
  return (Object.keys(people) as Handle[])
    .filter((h) => h !== project.owner.handle && offersSkill(h, skill))
    .sort((a, b) => (a === me.handle ? -1 : b === me.handle ? 1 : 0))
    .map((h) => people[h]);
}

export function peopleFit(project: Project) {
  return new Set(project.needs.flatMap((n) => fittersFor(project, n.skill).map((x) => x.handle))).size;
}

export function viewerFits(project: Project, need: Need) {
  return project.owner.handle !== me.handle && offersSkill(me.handle as Handle, need.skill);
}

export function projectsBy(handle: string) {
  return projects.filter((x) => x.owner.handle === handle);
}

export const inboxUnread = 3;

/** Home feed order. */
export const feedIds = ["soil-choir", "plant-monitor", "dungeon-drift", "study-quest", "paper-orbit"];

export const stories: { person: Person; tag: "swap" | "ring" | null; trade?: string }[] = [
  { person: p.maya, tag: "swap", trade: "firmware ⇄ UI" },
  { person: p.dev, tag: "ring", trade: "sound" },
  { person: p.rin, tag: "ring", trade: "gen. art" },
  { person: p.leila, tag: null },
  { person: p.tomas, tag: null },
];

export const neededMost = ["ESP32 firmware", "UI design", "Sound design", "3D modeling", "PCB design"];
