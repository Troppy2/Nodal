"""The project subgraph (docs/BACKEND.md "Graph matching") and cycle payloads."""

from ..world import World
from .cards import profile_lite, skill_out
from .matching import Edge, Matching

MAX_NODES = 40


def link_json(w: World, e: Edge) -> dict:
    return {"from": e.frm, "to": e.to, "project_id": e.project_id,
            "project_title": w.projects[e.project_id]["title"], "skill": skill_out(w.skills[e.skill_id])}


def serialize_cycles(w: World, cycles: list[dict]) -> list[dict]:
    return [{
        "id": c["id"], "kind": c["kind"], "score": c["score"],
        "members": [profile_lite(w.profiles[m]) for m in c["members"] if m in w.profiles],
        "links": [link_json(w, e) for e in c["links"]],
    } for c in cycles]


def _with_open_needs(w: World, project_ids) -> list[str]:
    open_ids = {n["project_id"] for n in w.open_needs}
    return [p for p in project_ids if p in open_ids]


def project_graph(w: World, project_id: str, depth: int) -> dict:
    """Breadth-first from the project; depth counts "fills" hops. The root owner is in the graph
    (with an owns edge), and at depth 2 the projects owned by the outer ring of people are added plus
    every fills edge between nodes already present, so a three-person ring closes on screen.
    Trimming to MAX_NODES keeps the root, its owner, then the best cycles, then nearer and stronger nodes."""
    m = w.matching
    nodes: dict[str, dict] = {}
    edges: dict[tuple, dict] = {}

    def add_project(pid: str, d: int):
        if pid not in nodes:
            p = w.projects[pid]
            nodes[pid] = {"id": pid, "kind": "project", "label": p["title"], "type": p["type"], "depth": d}
        owner = w.projects[pid]["owner_id"]
        nodes.setdefault(owner, {"id": owner, "kind": "profile", "label": owner, "depth": d})
        edges[("owns", owner, pid)] = {"source": owner, "target": pid, "kind": "owns", "skill": None, "_score": 0}

    def add_fill(e: Edge, d: int):
        nodes.setdefault(e.frm, {"id": e.frm, "kind": "profile", "label": e.frm, "depth": d})
        key = ("fills", e.frm, e.project_id)
        if key in edges and edges[key]["_score"] >= e.score:
            return      # one edge per person and project: keep the best skill, as matching does
        edges[key] = {"source": e.frm, "target": e.project_id, "kind": "fills",
                                                "skill": w.skills[e.skill_id]["name"], "_score": e.score}

    add_project(project_id, 0)
    frontier = [project_id]
    for d in range(1, depth + 1):
        next_frontier: list[str] = []
        for pid in frontier:
            fills = sorted(m.into_project.get(pid, []), key=lambda e: -e.score)
            for e in fills:
                add_fill(e, d)
            if d < depth:       # next hop: projects those helpers own that still have open needs
                for e in fills:
                    for owned in _with_open_needs(w, w.owned.get(e.frm, [])):
                        if owned not in nodes:
                            add_project(owned, d)
                            next_frontier.append(owned)
        frontier = next_frontier
    if depth >= 2:
        outer = [n["id"] for n in nodes.values() if n["kind"] == "profile" and n["depth"] == depth]
        for prof in outer:
            for owned in _with_open_needs(w, w.owned.get(prof, [])):
                add_project(owned, depth)
        present = set(nodes)
        for u in present:
            for es in m.adj.get(u, {}).values():
                for e in es:
                    if e.project_id in present and ("fills", u, e.project_id) not in edges:
                        add_fill(e, depth)

    if len(nodes) > MAX_NODES:
        nodes, edges = _trim(m, nodes, edges, keep_first=(project_id, w.projects[project_id]["owner_id"]))

    for k, n in nodes.items():
        if n["kind"] == "profile":
            handle = w.profiles.get(k, {}).get("handle", "?")
            n["label"], n["handle"] = f"@{handle}", handle

    present = set(nodes)
    cycles = [c for c in m.cycles
              if all(x in present for x in c["members"]) and all(e.project_id in present for e in c["links"])]
    for ed in edges.values():
        ed["cycle_ids"] = []
    for c in cycles:
        for e in c["links"]:
            for key in (("fills", e.frm, e.project_id), ("owns", e.to, e.project_id)):
                if key in edges and c["id"] not in edges[key]["cycle_ids"]:
                    edges[key]["cycle_ids"].append(c["id"])

    return {
        "root": project_id,
        "nodes": list(nodes.values()),
        "edges": [{k: v for k, v in ed.items() if k != "_score"} for ed in edges.values()],
        "cycles": [{"id": c["id"], "kind": c["kind"], "member_ids": c["members"]} for c in cycles],
    }


def _trim(m: Matching, nodes: dict, edges: dict, keep_first: tuple) -> tuple[dict, dict]:
    best: dict[str, int] = {}
    for ed in edges.values():
        for k in (ed["source"], ed["target"]):
            best[k] = max(best.get(k, 0), ed["_score"])
    # whole cycles that fit, best first, using at most half the cap so ordinary helpers still show
    present = set(nodes)
    in_cycle: set[str] = set()
    for c in m.cycles:
        part = set(c["members"]) | {e.project_id for e in c["links"]}
        if part <= present and len(in_cycle | part) <= MAX_NODES // 2:
            in_cycle |= part
    order = sorted(nodes, key=lambda k: (k not in keep_first, k not in in_cycle, nodes[k]["depth"], -best.get(k, 0)))
    keep = set(order[:MAX_NODES])
    return ({k: v for k, v in nodes.items() if k in keep},
            {k: v for k, v in edges.items() if v["source"] in keep and v["target"] in keep})
