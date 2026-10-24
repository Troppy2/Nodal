// Builds the People graph around one project from its open needs and who offers each skill.
// Mirrors GET /graph/projects/{id} at depth 1, with swap and ring marks from the cycle data.
import { fittersFor, type Handle, me, offers, type Project } from "@/lib/catalog";
import { cycleNotes, ringEdges } from "@/lib/seed-results";
import type { Person } from "@/lib/types";

export interface GraphNode {
  person: Person;
  skills: string[];
  level: number;
  kind: "swap" | "ring" | null;
  explain: string;
  chips: string[];
  /** Position in the graph box, in percent. */
  x: number;
  y: number;
}

const MAX_NODES = 8;

export function buildGraph(project: Project) {
  const notes = cycleNotes[project.id] ?? {};
  const byHandle = new Map<string, GraphNode>();

  for (const need of project.needs) {
    for (const person of fittersFor(project, need.skill)) {
      const level = offers[person.handle as Handle]?.find((o) => o.skill === need.skill)?.level ?? 1;
      const node = byHandle.get(person.handle);
      if (node) {
        node.skills.push(need.skill);
        node.level = Math.max(node.level, level);
        continue;
      }
      byHandle.set(person.handle, {
        person,
        skills: [need.skill],
        level,
        kind: notes[person.handle]?.kind ?? null,
        explain: "",
        chips: [],
        x: 0,
        y: 0,
      });
    }
  }

  // Swap first, then ring members (adjacent so the ring edge is short), then everyone else by level.
  const rank = (n: GraphNode) => (n.kind === "swap" ? 0 : n.kind === "ring" ? 1 : 2);
  const nodes = [...byHandle.values()].sort((a, b) => rank(a) - rank(b) || b.level - a.level).slice(0, MAX_NODES);

  nodes.forEach((n, i) => {
    const note = notes[n.person.handle];
    const isMe = n.person.handle === me.handle;
    n.explain =
      note?.explain ??
      (isMe ? `You offer ${n.skills.join(" and ")}.` : `Offers ${n.skills.join(" and ")} at level ${n.level}. No swap with you yet.`);
    n.chips = [...n.skills.map((s) => `Fills: ${s}`), `Level ${n.level}`, ...(note?.chips ?? [])];
    // Evenly around a circle, starting top-left so four people land on the corners.
    const angle = ((-135 + (i * 360) / nodes.length) * Math.PI) / 180;
    n.x = 50 + Math.cos(angle) * 40;
    n.y = 48 + Math.sin(angle) * 34;
  });

  const handles = new Set(nodes.map((n) => n.person.handle));
  const rings = (ringEdges[project.id] ?? []).filter((e) => handles.has(e.from) && handles.has(e.to));
  return { nodes, rings };
}
