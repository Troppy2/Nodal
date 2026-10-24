// Lays out GET /graph/projects/{id} as the People view: the project in the center, the people who
// fill its needs around it. Swap and ring marks come from the edges' cycle_ids.
import type { GraphOut, MatchOut, ProfileLite } from "@/lib/api-types";

export interface PersonNode {
  profile: ProfileLite;
  skills: string[];
  kind: "swap" | "ring" | null;
  /** Ranked reasons from GET /projects/{id}/matches, when present. */
  reasons: string[];
  reciprocal: boolean;
  /** Position in the graph box, in percent. */
  x: number;
  y: number;
}

const MAX_PEOPLE = 8;

export function layoutPeople(graph: GraphOut, matches: MatchOut[]) {
  const root = graph.root;
  const cycleKind = new Map(graph.cycles.map((c) => [c.id, c.kind]));
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const matchBy = new Map<string, MatchOut[]>();
  for (const m of matches) matchBy.set(m.profile.id, [...(matchBy.get(m.profile.id) ?? []), m]);

  const people = new Map<string, PersonNode>();
  for (const e of graph.edges) {
    if (e.kind !== "fills" || e.target !== root) continue;
    const node = byId.get(e.source);
    if (!node || node.kind !== "profile") continue;
    const ms = matchBy.get(e.source) ?? [];
    const prev = people.get(e.source);
    // A swap outranks a ring when one person is in both.
    const kinds = e.cycle_ids.map((id) => cycleKind.get(id)).filter(Boolean) as ("swap" | "ring")[];
    const kind = kinds.includes("swap") ? "swap" : kinds.includes("ring") ? "ring" : null;
    const profile: ProfileLite = ms[0]?.profile ?? {
      id: node.id,
      handle: node.handle ?? node.label.replace(/^@/, ""),
      display_name: null,
      avatar_url: null,
    };
    people.set(e.source, {
      profile,
      skills: [...new Set([...(prev?.skills ?? []), ...(e.skill ? [e.skill] : [])])],
      kind: prev?.kind === "swap" ? "swap" : (kind ?? prev?.kind ?? null),
      reasons: [...new Set(ms.flatMap((m) => m.reasons))],
      reciprocal: ms.some((m) => m.reciprocal),
      x: 0,
      y: 0,
    });
  }
  // People with matches the graph left out (it caps nodes) still belong in the view.
  for (const [id, ms] of matchBy) {
    if (people.has(id)) continue;
    people.set(id, {
      profile: ms[0].profile,
      skills: [...new Set(ms.map((m) => m.skill.name))],
      kind: ms.some((m) => m.reciprocal) ? "swap" : null,
      reasons: [...new Set(ms.flatMap((m) => m.reasons))],
      reciprocal: ms.some((m) => m.reciprocal),
      x: 0,
      y: 0,
    });
  }

  const rank = (n: PersonNode) => (n.kind === "swap" ? 0 : n.kind === "ring" ? 1 : 2);
  const nodes = [...people.values()].sort((a, b) => rank(a) - rank(b) || b.reasons.length - a.reasons.length).slice(0, MAX_PEOPLE);
  nodes.forEach((n, i) => {
    // Evenly around a circle, starting top-left so four people land on the corners.
    const angle = ((-135 + (i * 360) / nodes.length) * Math.PI) / 180;
    n.x = 50 + Math.cos(angle) * 40;
    n.y = 48 + Math.sin(angle) * 34;
  });

  // Dashed teal line between two people who sit in the same ring.
  const shown = new Set(nodes.map((n) => n.profile.id));
  const rings: { from: string; to: string }[] = [];
  for (const c of graph.cycles) {
    if (c.kind !== "ring") continue;
    const inRing = c.member_ids.filter((m) => shown.has(m));
    for (let i = 0; i < inRing.length; i++)
      for (let j = i + 1; j < inRing.length; j++)
        if (!rings.some((r) => (r.from === inRing[i] && r.to === inRing[j]) || (r.from === inRing[j] && r.to === inRing[i])))
          rings.push({ from: inRing[i], to: inRing[j] });
  }
  return { nodes, rings };
}
