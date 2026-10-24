// Demo data for the checks and people screen (Soil Choir), shaped like the API responses.

export interface Source {
  id: string;
  url: string;
  title: string;
}

export interface ReportItem {
  text: string;
  fact_ids: string[];
}

export interface MarketReport {
  verdict: "promising" | "mixed" | "weak" | "not_enough_evidence";
  confidence: "low" | "medium" | "high";
  summary: string;
  competitors: { name: string; what: string; fact_ids: string[] }[];
  demand_signals: ReportItem[];
  market_size: ReportItem[];
  business_models: ReportItem[];
  risks: ReportItem[];
  next_steps: string[];
}

export interface CoolFactor {
  overall: number;
  measures: { key: "novelty" | "demo_appeal" | "fun_to_build" | "scope"; score: number; reason: string }[];
  why: string;
}

export const marketRun = {
  is_sample: true,
  status: "done" as const,
  report: {
    verdict: "mixed",
    confidence: "low",
    summary:
      "People buy plant sensors, but few pay for a sensor alone. No direct competitor sells the music angle in the sources found. That could mean a small market or an open one.",
    competitors: [
      { name: "Consumer soil sensors", what: "Track moisture, send alerts, no sound.", fact_ids: ["f1"] },
      { name: "Plant-care apps", what: "Reminders and identification, software only.", fact_ids: ["f2"] },
      { name: "Generative music toys", what: "Playful, but not tied to a living plant.", fact_ids: ["f3"] },
    ],
    demand_signals: [{ text: "Plant communities ask for sensors that are fun to look at, not only useful.", fact_ids: ["f2"] }],
    market_size: [],
    business_models: [],
    risks: [{ text: "Hardware cost and shipping make a small production run expensive.", fact_ids: ["f1"] }],
    next_steps: [
      "Build one working unit and show it to five plant owners.",
      "Test whether people pay for the music or the sensor.",
    ],
  } satisfies MarketReport,
  facts: { f1: "s1", f2: "s2", f3: "s3" } as Record<string, string>,
  sources: [
    { id: "s1", url: "https://example.com", title: "Soil sensors compared" },
    { id: "s2", url: "https://example.com/plants", title: "Plant community thread" },
    { id: "s3", url: "https://example.com/audio", title: "Generative music toys" },
  ] satisfies Source[],
};

export const coolFactor: CoolFactor = {
  overall: 8.0,
  measures: [
    { key: "novelty", score: 8, reason: "Plant sensors are common; turning them into music is not." },
    { key: "demo_appeal", score: 9, reason: "Water the plant and the room changes. It demos in ten seconds." },
    { key: "fun_to_build", score: 8, reason: "Firmware, sound, and art each get a clear piece to own." },
    { key: "scope", score: 7, reason: "One sensor and a synth patch fit a weekend; the enclosure may not." },
  ],
  why: "A living plant you can hear is instantly shareable. The main risk is the sound design: it has to stay pleasant for hours.",
};

export const measureLabel: Record<CoolFactor["measures"][number]["key"], string> = {
  novelty: "Novelty",
  demo_appeal: "Demo appeal",
  fun_to_build: "Fun to build with others",
  scope: "Weekend-sized scope",
};

/** Swap and ring context for the seeded idea (from GET /me/cycles). Other projects have none yet. */
export interface CycleNote {
  kind: "swap" | "ring";
  explain: string;
  chips: string[];
}

export const cycleNotes: Record<string, Record<string, CycleNote>> = {
  "soil-choir": {
    maya: {
      kind: "swap",
      explain: "Writes the firmware for you. You design the UI for her plant monitor app.",
      chips: ["Swap: she needs UI design, you offer it"],
    },
    dev: {
      kind: "ring",
      explain: "Scores the soil readings. In a 3-way ring: you design Dev's menus, Dev scores Rin's piece.",
      chips: ["Ring: you, Dev, Rin"],
    },
    rin: {
      kind: "ring",
      explain: "Draws visuals that bloom with the music. Closes the ring with you and Dev.",
      chips: ["Ring: you, Dev, Rin"],
    },
  },
};

/** Extra edges between people that close a ring, per project. */
export const ringEdges: Record<string, { from: string; to: string; label: string }[]> = {
  "soil-choir": [{ from: "dev", to: "rin", label: "Ring" }],
};

/** Progress labels streamed by the research pipeline (BACKEND.md research agent). */
export const marketSteps = (title: string) => [
  "Planning searches",
  `Searching: ${title.toLowerCase()} competitors`,
  `Searching: who needs ${title.toLowerCase()}`,
  "Reading: example.com",
  "Reading: example.com/plants",
  "Extracting facts",
  "Writing report",
];

export const coolSteps = ["Looking for similar projects", "Scoring four measures", "Checking scores"];
