// Profile-only demo facts that the catalog doesn't carry yet (bios, follower counts, Tolken history).
import type { Handle } from "@/lib/catalog";

export const bios: Record<Handle, string> = {
  inah: "CS student building across software, hardware, and art. Looking for people to swap skills with.",
  maya: "Hardware tinkerer. Sensors, e-ink, and batteries that last. Will trade firmware for a good UI.",
  dev: "Game dev and sound designer. Makes engines hum and menus click.",
  rin: "Generative artist working with prints, paper, and live data.",
  leila: "Product designer moving into mobile. Likes calm interfaces and loud colors.",
  tomas: "Mechanical engineer. Boards, enclosures, and anything that lives outdoors.",
};

export const followers: Record<Handle, number> = { inah: 128, maya: 342, dev: 210, rin: 167, leila: 95, tomas: 74 };

/** Tolken, the in-app currency. No money is involved anywhere in Nodal. */
export const tolkenHistory = [
  { title: "Soil Choir", detail: "Bounty share · 40%", amount_tolken: 10, status: "Released" },
  { title: "Dungeon Drift", detail: "UI design bounty", amount_tolken: 30, status: "Funded" },
];

export const cycles = [
  { kind: "Swap", text: "maya writes firmware, you design her app", thread: "swap-maya" },
  { kind: "Ring", text: "you → dev → rin → you", thread: "ring-dev-rin" },
];
