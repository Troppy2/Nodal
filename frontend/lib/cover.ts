import type { ProjectType } from "./api-types";

export const tints: Record<ProjectType | "teal", { fg: string; bg: string }> = {
  software: { fg: "#1f4fd8", bg: "#e3eafb" },
  hardware: { fg: "#8a5a00", bg: "#f6ecd3" },
  creative: { fg: "#be185d", bg: "#fbe4ee" },
  teal: { fg: "#0f766e", bg: "#e2f3f0" },
};

export const typeLabel: Record<ProjectType, string> = {
  software: "Software",
  hardware: "Hardware",
  creative: "Creative",
};

/** Tolken is the in-app currency. There is no money anywhere in Nodal. */
export const TOLKEN = "◈";

export function formatTolken(amount: number) {
  return `${TOLKEN} ${amount}`;
}
