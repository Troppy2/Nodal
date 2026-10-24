// Demo data for the team and shares screen until GET /projects/{id}/team is wired.
import { fittersFor, type Handle, offers, people, type Project } from "./catalog";
import type { Person } from "./types";

export interface Member {
  person: Person;
  role: "owner" | "contributor";
  status: "joined" | "invited";
  skills: string;
  /** Basis points: 4000 = 40%. Null until an invited member accepts. */
  share_bps: number | null;
}

/** Soil Choir after the swap and ring: Maya and Dev joined, Rin still deciding. */
const seeded: Record<string, Member[]> = {
  "soil-choir": [
    { person: people.inah, role: "owner", status: "joined", skills: "Python backend, UI design", share_bps: 4000 },
    { person: people.maya, role: "contributor", status: "joined", skills: "ESP32 firmware", share_bps: 3000 },
    { person: people.dev, role: "contributor", status: "joined", skills: "Sound design", share_bps: 3000 },
    { person: people.rin, role: "contributor", status: "invited", skills: "Generative art", share_bps: null },
  ],
};

/** Members of any project: seeded teams as above, otherwise its members with equal shares (remainder to the owner). */
export function teamFor(project: Project): Member[] {
  if (seeded[project.id]) return seeded[project.id];
  const handles = [project.owner.handle as Handle, ...project.memberHandles.filter((h) => h !== project.owner.handle)];
  const each = Math.floor(10000 / handles.length);
  return handles.map((h, i) => ({
    person: people[h],
    role: i === 0 ? "owner" : "contributor",
    status: "joined",
    skills: offers[h].map((o) => o.skill).join(", "),
    share_bps: i === 0 ? 10000 - each * (handles.length - 1) : each,
  }));
}

/** First open need nobody on the team covers, with the best person outside the team who fits it. */
export function stillOpenFor(project: Project, members: Member[]) {
  const onTeam = new Set(members.map((m) => m.person.handle));
  const covered = new Set(members.flatMap((m) => m.skills.split(", ")));
  for (const need of project.needs) {
    if (covered.has(need.skill)) continue;
    const person = fittersFor(project, need.skill).find((p) => !onTeam.has(p.handle));
    if (person) return { need, person };
  }
  // Soil Choir's seeded team covers its listed needs; the enclosure is the next gap.
  if (project.id === "soil-choir") return { need: { skill: "3D modeling", note: "A printable enclosure for the sensor" }, person: people.tomas };
  return null;
}
