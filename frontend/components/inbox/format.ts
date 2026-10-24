import type { InboxItem, ProfileLite } from "@/lib/api-types";

/** "Maya", "Maya and Rin", "Maya, Rin and Dev". */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function displayName(p: Pick<ProfileLite, "display_name" | "handle">) {
  return p.display_name?.trim() || p.handle;
}

/** Short relative time: "now", "5m", "3h", "2d", then a date. */
export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Headline and one-line summary for an inbox row. */
export function describe(item: InboxItem) {
  const names = joinNames(item.people.map(displayName));
  if (item.kind === "collab") {
    const skill = item.skill?.name ?? "help";
    const project = item.project?.title ?? "a project";
    return item.direction === "incoming"
      ? { title: names, summary: `Wants to help with ${project} as ${skill}` }
      : { title: names || "Your request", summary: `You offered ${skill} for ${project}` };
  }
  const what = item.kind === "swap" ? "a swap" : "a 3-way ring";
  return item.direction === "incoming"
    ? { title: names, summary: `Invited you to ${what}` }
    : { title: names, summary: `You invited them to ${what}` };
}

/** People who still have to answer, by name, excluding the viewer. */
export function waitingOn(item: InboxItem, meId: string | null) {
  const byId = new Map(item.people.map((p) => [p.id, displayName(p)]));
  return Object.entries(item.responses)
    .filter(([id, r]) => r === "pending" && id !== meId)
    .map(([id]) => byId.get(id) ?? "someone");
}
