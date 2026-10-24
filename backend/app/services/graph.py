"""Swap and ring detection plus the project subgraph (docs/BACKEND.md "Graph matching")."""

import hashlib

from .cards import profile_lite, profiles_by_id, skill_out
from .matching import Edge, Snapshot

MAX_NODES = 40


def _best(snap: Snapshot, u: str, v: str) -> Edge:
    return max(snap.adj[u][v], key=lambda e: e.score)


def cycle_id(kind: str, members: list[str]) -> str:
    return hashlib.sha1(f"{kind}:{','.join(sorted(members))}".encode()).hexdigest()[:12]


def detect_cycles(snap: Snapshot) -> list[dict]:
    """Every swap (2-cycle) and ring (3-cycle), deduped, each with its links and summed edge score.
    Raw form: {id, kind, score, members: [ids in cycle order], links: [Edge]}."""
    seen: set[tuple] = set()
    out: list[dict] = []
    for u, outs in snap.adj.items():
        for v in outs:
            # swap
            if u in snap.adj.get(v, {}):
                key = ("swap", *sorted((u, v)))
                if key not in seen:
                    seen.add(key)
                    links = [_best(snap, u, v), _best(snap, v, u)]
                    out.append({"kind": "swap", "members": [u, v], "links": links})
            # ring u -> v -> w -> u
            for w in snap.adj.get(v, {}):
                if w in (u, v) or u not in snap.adj.get(w, {}):
                    continue
                trio = [u, v, w]
                i = trio.index(min(trio))
                rot = tuple(trio[i:] + trio[:i])
                if ("ring", *rot) in seen:
                    continue
                seen.add(("ring", *rot))
                a, b, c = rot
                out.append({"kind": "ring", "members": list(rot),
                            "links": [_best(snap, a, b), _best(snap, b, c), _best(snap, c, a)]})
    for c in out:
        c["id"] = cycle_id(c["kind"], c["members"])
        c["score"] = sum(e.score for e in c["links"])
    out.sort(key=lambda c: -c["score"])
    return out


def cycles_for(snap: Snapshot, profile_id: str, limit: int = 10) -> list[dict]:
    return [c for c in detect_cycles(snap) if profile_id in c["members"]][:limit]


def serialize_cycles(snap: Snapshot, cycles: list[dict]) -> list[dict]:
    people = profiles_by_id({m for c in cycles for m in c["members"]})
    return [{
        "id": c["id"], "kind": c["kind"], "score": c["score"],
        "members": [profile_lite(people[m]) for m in c["members"] if m in people],
        "links": [link_json(snap, e) for e in c["links"]],
    } for c in cycles]


def link_json(snap: Snapshot, e: Edge) -> dict:
    return {"from": e.frm, "to": e.to, "project_id": e.project_id,
            "project_title": snap.projects[e.project_id]["title"], "skill": skill_out(snap.skills[e.skill_id])}


def project_graph(snap: Snapshot, project_id: str, depth: int) -> dict:
    """BFS from the project. Depth counts "fills" hops. The root owner is included (with an owns edge)
    and fills edges between nodes already in the graph are added, so a seeded ring closes on screen."""
    root = snap.projects[project_id]
    nodes: dict[str, dict] = {}
    edges: dict[tuple, dict] = {}

    def add_project(pid: str, d: int):
        if pid not in nodes:
            p = snap.projects[pid]
            nodes[pid] = {"id": pid, "kind": "project", "label": p["title"], "type": p["type"], "depth": d}

    def add_profile(prof: str, d: int):
        nodes.setdefault(prof, {"id": prof, "kind": "profile", "label": prof, "depth": d})

    def add_fill(e: Edge):
        edges[("fills", e.frm, e.project_id)] = {"source": e.frm, "target": e.project_id, "kind": "fills",
                                                "skill": snap.skills[e.skill_id]["name"], "_score": e.score}

    def add_owns(prof: str, pid: str):
        edges[("owns", prof, pid)] = {"source": prof, "target": pid, "kind": "owns", "skill": None, "_score": 0}

    add_project(project_id, 0)
    add_profile(root["owner_id"], 0)
    add_owns(root["owner_id"], project_id)

    frontier = [project_id]
    for d in range(1, depth + 1):
        next_frontier: list[str] = []
        for pid in frontier:
            fills = sorted(snap.fill_edges_for_project(pid), key=lambda e: -e.score)
            for e in fills:
                add_profile(e.frm, d)
                add_fill(e)
            if d == depth:
                continue
            # next hop: projects those people own that still have open needs
            for e in fills:
                for owned in snap.owned.get(e.frm, []):
                    if owned != pid and owned not in nodes and any(n["project_id"] == owned for n in snap.needs):
                        add_project(owned, d)
                        add_owns(e.frm, owned)
                        next_frontier.append(owned)
        frontier = next_frontier
    if depth >= 2:
        # projects owned by the last ring of people, so a three-person ring can close
        for prof in [n["id"] for n in nodes.values() if n["kind"] == "profile" and n["depth"] == depth]:
            for owned in snap.owned.get(prof, []):
                # no size check here: the cap below trims, and keeps whole cycles first
                if any(n["project_id"] == owned for n in snap.needs):
                    add_project(owned, depth)
                    add_owns(prof, owned)
        # fills edges between nodes already present
        present = set(nodes)
        for u, outs in snap.adj.items():
            if u not in present:
                continue
            for es in outs.values():
                for e in es:
                    if e.project_id in present and ("fills", u, e.project_id) not in edges:
                        add_fill(e)

    # cap nodes: keep root, its owner, then the best cycles' people and projects (up to half the cap,
    # so a seeded ring survives a crowd of single fillers), then by depth and best edge score
    if len(nodes) > MAX_NODES:
        best: dict[str, int] = {}
        for ed in edges.values():
            for k in (ed["source"], ed["target"]):
                best[k] = max(best.get(k, 0), ed["_score"])
        present = set(nodes)
        in_cycle: set[str] = set()
        for c in sorted(detect_cycles(snap), key=lambda c: -c["score"]):
            part = set(c["members"]) | {e.project_id for e in c["links"]}
            if part <= present and len(in_cycle | part) <= MAX_NODES // 2:
                in_cycle |= part
        keep = sorted(nodes, key=lambda k: (k not in (project_id, root["owner_id"]), k not in in_cycle,
                                            nodes[k]["depth"], -best.get(k, 0)))
        keep_set = set(keep[:MAX_NODES])
        nodes = {k: v for k, v in nodes.items() if k in keep_set}
        edges = {k: v for k, v in edges.items() if v["source"] in keep_set and v["target"] in keep_set}

    profile_ids = [k for k, v in nodes.items() if v["kind"] == "profile"]
    people = profiles_by_id(profile_ids)
    for k in profile_ids:
        h = people.get(k, {}).get("handle", "?")
        nodes[k]["label"] = f"@{h}"
        nodes[k]["handle"] = h

    # cycles fully inside the graph; mark the edges that belong to each
    present = set(nodes)
    cycles = [c for c in detect_cycles(snap) if all(m in present for m in c["members"])
              and all(e.project_id in present for e in c["links"])]
    for ed in edges.values():
        ed["cycle_ids"] = []
    for c in cycles:
        for e in c["links"]:
            key = ("fills", e.frm, e.project_id)
            if key in edges:
                edges[key]["cycle_ids"].append(c["id"])
            okey = ("owns", e.to, e.project_id)
            if okey in edges and c["id"] not in edges[okey]["cycle_ids"]:
                edges[okey]["cycle_ids"].append(c["id"])

    return {
        "root": project_id,
        "nodes": list(nodes.values()),
        "edges": [{k: v for k, v in ed.items() if k != "_score"} for ed in edges.values()],
        "cycles": [{"id": c["id"], "kind": c["kind"], "member_ids": c["members"]} for c in cycles],
    }
