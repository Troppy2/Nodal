"""Rule-based matching over open needs and available offers (docs/BACKEND.md "Matching").

`Snapshot.load()` reads everything matching needs in a fixed number of queries; graph, feed,
recommendations and stories all score from the same snapshot so a request never fans out per row.
"""

from collections import defaultdict
from dataclasses import dataclass, field

from ..db import service_client


@dataclass
class Edge:
    """u -> v: `frm` offers `skill_id`, which fills an open need on `project_id`, owned by `to`."""
    frm: str
    to: str
    project_id: str
    need_id: str
    skill_id: int
    level: int
    score: int = 0


@dataclass
class Snapshot:
    projects: dict[str, dict]                 # id -> {owner_id, type, title, stage, created_at}
    needs: list[dict]                          # open needs
    offers: dict[str, dict[int, int]]          # profile -> {skill_id: level}
    skills: dict[int, dict]
    tags: dict[str, set[str]]                  # project -> tags
    interests: dict[str, set[str]]             # profile -> interests
    owned: dict[str, list[str]] = field(default_factory=dict)       # profile -> project ids
    adj: dict[str, dict[str, list[Edge]]] = field(default_factory=dict)

    @classmethod
    def load(cls) -> "Snapshot":
        sb = service_client()
        projects = {p["id"]: p for p in sb.table("projects").select("id,owner_id,type,title,stage,created_at").execute().data}
        needs = sb.table("project_needs").select("id,project_id,skill_id,bounty_tolken").eq("status", "open").execute().data
        offers: dict[str, dict[int, int]] = defaultdict(dict)
        for o in sb.table("profile_offers").select("profile_id,skill_id,level").eq("available", True).execute().data:
            offers[o["profile_id"]][o["skill_id"]] = o["level"]
        skills = {s["id"]: s for s in sb.table("skills").select("*").execute().data}
        tags: dict[str, set[str]] = defaultdict(set)
        for t in sb.table("project_tags").select("project_id,tag").execute().data:
            tags[t["project_id"]].add(t["tag"])
        interests = {p["id"]: set(p.get("interests") or []) for p in sb.table("profiles").select("id,interests").execute().data}
        snap = cls(projects, needs, offers, skills, tags, interests)
        snap._build()
        return snap

    def _build(self) -> None:
        owned: dict[str, list[str]] = defaultdict(list)
        for pid, p in self.projects.items():
            owned[p["owner_id"]].append(pid)
        self.owned = owned
        offerers: dict[int, list[str]] = defaultdict(list)
        for prof, skills in self.offers.items():
            for sid in skills:
                offerers[sid].append(prof)
        adj: dict[str, dict[str, list[Edge]]] = defaultdict(lambda: defaultdict(list))
        for n in self.needs:
            proj = self.projects.get(n["project_id"])
            if not proj:
                continue
            for u in offerers[n["skill_id"]]:
                if u == proj["owner_id"]:
                    continue
                adj[u][proj["owner_id"]].append(
                    Edge(u, proj["owner_id"], n["project_id"], n["id"], n["skill_id"], self.offers[u][n["skill_id"]])
                )
        self.adj = adj
        for u, outs in adj.items():
            for v, edges in outs.items():
                for e in edges:
                    e.score = self.edge_score(e)

    # ---- scoring ----

    def profile_tags(self, profile_id: str) -> set[str]:
        out: set[str] = set()
        for pid in self.owned.get(profile_id, []):
            out |= self.tags.get(pid, set())
        return out

    def reciprocal(self, u: str, v: str) -> bool:
        return v in self.adj.get(u, {}) and u in self.adj.get(v, {})

    def same_category(self, u: str, skill_id: int, project_type: str) -> bool:
        return any(sid != skill_id and self.skills[sid]["category"] == project_type for sid in self.offers.get(u, {}))

    def shared_tags(self, u: str, project_id: str) -> set[str]:
        return self.tags.get(project_id, set()) & self.profile_tags(u)

    def edge_score(self, e: Edge) -> int:
        proj = self.projects[e.project_id]
        return (
            50 + 15 * (e.level - 1)
            + 20 * self.same_category(e.frm, e.skill_id, proj["type"])
            + 5 * min(len(self.shared_tags(e.frm, e.project_id)), 3)
            + 25 * self.reciprocal(e.frm, e.to)
        )

    def reasons(self, e: Edge) -> list[str]:
        proj = self.projects[e.project_id]
        skill = self.skills[e.skill_id]["name"]
        out = [f"Matches need: {skill}", f"Skill level {e.level}"]
        if self.same_category(e.frm, e.skill_id, proj["type"]):
            out.append(f"Also offers {proj['type']} skills")
        shared = sorted(self.shared_tags(e.frm, e.project_id))[:3]
        if shared:
            out.append("Shares tags: " + ", ".join(shared))
        if self.reciprocal(e.frm, e.to):
            out.append("Swap: they need a skill the owner offers")
        return out

    def fill_edges_for_project(self, project_id: str) -> list[Edge]:
        owner = self.projects[project_id]["owner_id"]
        return [e for u, outs in self.adj.items() for e in outs.get(owner, []) if e.project_id == project_id]


def project_matches(snap: Snapshot, project_id: str, limit: int = 10) -> list[Edge]:
    """Best edge per person for this project, top `limit` by score."""
    best: dict[str, Edge] = {}
    for e in snap.fill_edges_for_project(project_id):
        if e.frm not in best or e.score > best[e.frm].score:
            best[e.frm] = e
    return sorted(best.values(), key=lambda e: -e.score)[:limit]


def viewer_matches(snap: Snapshot, viewer_id: str, limit: int = 20) -> list[Edge]:
    """Mirror view: projects whose needs the viewer can fill, best edge per project."""
    best: dict[str, Edge] = {}
    for edges in snap.adj.get(viewer_id, {}).values():
        for e in edges:
            if e.project_id not in best or e.score > best[e.project_id].score:
                best[e.project_id] = e
    return sorted(best.values(), key=lambda e: -e.score)[:limit]
