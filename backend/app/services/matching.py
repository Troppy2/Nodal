"""Rule-based matching (docs/BACKEND.md "Matching" and "Graph matching").

A directed edge u -> v means u offers a skill that fills an open need on a project v owns. Edges are
scored once per world load; swaps (u <-> v) and rings (u -> v -> w -> u) are found from the same edges.

Edge score: 50 base, +15 per skill level above 1, +20 if u also offers another skill in the project's
category, +5 per shared tag (max 3), +25 if the pair is reciprocal (a swap).
"""

import hashlib
from collections import defaultdict
from dataclasses import dataclass
from functools import cached_property

from ..world import World


@dataclass
class Edge:
    frm: str            # the helper
    to: str             # the project owner
    project_id: str
    need_id: str
    skill_id: int
    level: int
    score: int = 0


def cycle_id(kind: str, members: list[str]) -> str:
    return hashlib.sha1(f"{kind}:{','.join(sorted(members))}".encode()).hexdigest()[:12]


class Matching:
    def __init__(self, w: World):
        self.w = w
        adj: dict[str, dict[str, list[Edge]]] = defaultdict(lambda: defaultdict(list))
        for n in w.open_needs:
            owner = w.projects[n["project_id"]]["owner_id"]
            for u in w.offerers.get(n["skill_id"], []):
                if u != owner:
                    adj[u][owner].append(Edge(u, owner, n["project_id"], n["id"], n["skill_id"], w.offers[u][n["skill_id"]]))
        self.adj = adj
        self.into_project: dict[str, list[Edge]] = defaultdict(list)
        for outs in adj.values():
            for edges in outs.values():
                for e in edges:
                    e.score = self._score(e)
                    self.into_project[e.project_id].append(e)

    # ---- scoring ----

    def reciprocal(self, u: str, v: str) -> bool:
        return v in self.adj.get(u, {}) and u in self.adj.get(v, {})

    def profile_tags(self, profile_id: str) -> set[str]:
        return set().union(*(self.w.tags.get(pid, set()) for pid in self.w.owned.get(profile_id, [])))

    def _also_in_category(self, e: Edge) -> bool:
        category = self.w.projects[e.project_id]["type"]
        return any(sid != e.skill_id and self.w.skills[sid]["category"] == category for sid in self.w.offers.get(e.frm, {}))

    def _shared_tags(self, e: Edge) -> set[str]:
        return self.w.tags.get(e.project_id, set()) & self.profile_tags(e.frm)

    def _score(self, e: Edge) -> int:
        return (50 + 15 * (e.level - 1) + 20 * self._also_in_category(e)
                + 5 * min(len(self._shared_tags(e)), 3) + 25 * self.reciprocal(e.frm, e.to))

    def reasons(self, e: Edge) -> list[str]:
        out = [f"Matches need: {self.w.skills[e.skill_id]['name']}", f"Skill level {e.level}"]
        if self._also_in_category(e):
            out.append(f"Also offers {self.w.projects[e.project_id]['type']} skills")
        shared = sorted(self._shared_tags(e))[:3]
        if shared:
            out.append("Shares tags: " + ", ".join(shared))
        if self.reciprocal(e.frm, e.to):
            out.append("Swap: they need a skill the owner offers")
        return out

    # ---- queries ----

    def for_project(self, project_id: str, limit: int = 10) -> list[Edge]:
        """Best edge per person who can help this project, top `limit` by score."""
        return _best_per(self.into_project.get(project_id, []), key=lambda e: e.frm)[:limit]

    def for_helper(self, profile_id: str, limit: int = 20) -> list[Edge]:
        """Projects this person can help, best edge per project."""
        edges = [e for es in self.adj.get(profile_id, {}).values() for e in es]
        return _best_per(edges, key=lambda e: e.project_id)[:limit]

    def swap_partners(self, profile_id: str) -> set[str]:
        return {v for v in self.adj.get(profile_id, {}) if self.reciprocal(profile_id, v)}

    @cached_property
    def cycles(self) -> list[dict]:
        """Every swap and ring, best first: {id, kind, score, members (in cycle order), links: [Edge]}."""
        def best(u: str, v: str) -> Edge:
            return max(self.adj[u][v], key=lambda e: e.score)

        found: dict[tuple, dict] = {}
        for u, outs in self.adj.items():
            for v in outs:
                if u in self.adj.get(v, {}):
                    key = ("swap", *sorted((u, v)))
                    found.setdefault(key, {"kind": "swap", "members": [u, v], "links": [best(u, v), best(v, u)]})
                for x in self.adj.get(v, {}):
                    if x in (u, v) or u not in self.adj.get(x, {}):
                        continue
                    trio = [u, v, x]
                    i = trio.index(min(trio))
                    a, b, c = trio[i:] + trio[:i]          # rotate so the smallest id leads: one key per ring
                    found.setdefault(("ring", a, b, c), {"kind": "ring", "members": [a, b, c],
                                                         "links": [best(a, b), best(b, c), best(c, a)]})
        out = list(found.values())
        for c in out:
            c["id"] = cycle_id(c["kind"], c["members"])
            c["score"] = sum(e.score for e in c["links"])
        out.sort(key=lambda c: -c["score"])
        return out

    def cycles_for(self, profile_id: str, limit: int = 10) -> list[dict]:
        return [c for c in self.cycles if profile_id in c["members"]][:limit]


def _best_per(edges: list[Edge], key) -> list[Edge]:
    best: dict[str, Edge] = {}
    for e in edges:
        k = key(e)
        if k not in best or e.score > best[k].score:
            best[k] = e
    return sorted(best.values(), key=lambda e: -e.score)
