"""ProjectCard and ProjectDetail payloads, built from the world with no database round trips."""

import hashlib

from ..world import World

PATTERNS = ["rings", "bars", "blocks", "stripes", "dots"]
VERDICT_LABEL = {"promising": "Promising", "mixed": "Mixed", "weak": "Weak", "not_enough_evidence": "Not enough evidence"}
FITTERS_SHOWN = 5


def cover_for(project_id: str, type_: str) -> dict:
    """Deterministic cover when there is no cover_url: pattern from a hash of the id, tint from the type."""
    h = int(hashlib.sha1(project_id.encode()).hexdigest(), 16)
    return {"pattern": PATTERNS[h % len(PATTERNS)], "tint": type_}


def profile_lite(p: dict) -> dict:
    return {"id": p["id"], "handle": p["handle"], "display_name": p.get("display_name"), "avatar_url": p.get("avatar_url")}


def skill_out(s: dict) -> dict:
    return {"id": s["id"], "name": s["name"], "slug": s["slug"], "category": s["category"]}


def project_ref(w: World, project_id: str) -> dict:
    p = w.projects[project_id]
    return {"id": p["id"], "title": p["title"], "type": p["type"], "owner": profile_lite(w.profiles[p["owner_id"]])}


def _fitters(w: World, project: dict, skill_id: int, viewer_id: str | None) -> list[str]:
    """People who offer this skill, owner excluded: viewer first, then by handle (offerers is by handle)."""
    out = [i for i in w.offerers.get(skill_id, []) if i != project["owner_id"] and i in w.profiles]
    return sorted(out, key=lambda i: i != viewer_id)


def _need(w: World, project: dict, n: dict, viewer_id: str | None) -> dict:
    fitters = _fitters(w, project, n["skill_id"], viewer_id)
    return {
        "id": n["id"], "skill": skill_out(w.skills[n["skill_id"]]), "note": n.get("note"),
        "bounty_tolken": n.get("bounty_tolken"), "status": n["status"],
        "fitters": [profile_lite(w.profiles[i]) for i in fitters[:FITTERS_SHOWN]],
        "viewer_fits": viewer_id is not None and viewer_id != project["owner_id"] and viewer_id in fitters,
        "viewer_requested": (project["id"], n["skill_id"]) in w.requested.get(viewer_id, ()),
    }


def card(w: World, project_id: str, viewer_id: str | None = None) -> dict:
    p = w.projects[project_id]
    rows = w.needs_by_project.get(project_id, [])
    people_fit = {i for n in rows if n["status"] == "open" for i in _fitters(w, p, n["skill_id"], None)}
    run = w.badge_run(project_id, viewer_id) if p["stage"] == "idea" else None   # checks are for ideas only
    stars = w.stars.get(project_id, set())
    return {
        "id": project_id, "slug": p.get("slug") or project_id, "title": p["title"], "summary": p["summary"], "type": p["type"], "stage": p["stage"],
        "source_access": p["source_access"], "cover": cover_for(project_id, p["type"]), "cover_url": p.get("cover_url"),
        "owner": profile_lite(w.profiles[p["owner_id"]]), "tags": sorted(w.tags.get(project_id, ())),
        "needs": [_need(w, p, n, viewer_id) for n in rows],
        "star_count": len(stars), "comment_count": w.comment_count[project_id], "people_fit": len(people_fit),
        "badges": {"market_verdict": VERDICT_LABEL.get((run or {}).get("verdict")), "cool_score": (run or {}).get("cool")},
        "viewer_starred": viewer_id in stars, "created_at": p["created_at"],
    }


def cards(w: World, project_ids, viewer_id: str | None = None) -> list[dict]:
    """Cards in the given order; ids not in the world (or with a missing owner) are skipped."""
    return [card(w, pid, viewer_id) for pid in project_ids
            if pid in w.projects and w.projects[pid]["owner_id"] in w.profiles]


def members(w: World, project_id: str, show_shares: bool) -> list[dict]:
    """Team list, owner first. Revenue shares are team-only, so others get share_bps None."""
    rows = sorted(w.members.get(project_id, []), key=lambda m: m["role"] != "owner")
    return [{
        "profile": profile_lite(w.profiles[m["profile_id"]]), "role": m["role"],
        "skill": skill_out(w.skills[m["skill_id"]]) if m.get("skill_id") else None,
        "share_bps": m.get("share_bps") if show_shares else None, "status": m["status"],
    } for m in rows if m["profile_id"] in w.profiles]


def detail(w: World, project_id: str, viewer_id: str | None = None) -> dict:
    out = card(w, project_id, viewer_id)
    p = w.projects[project_id]
    on_team = viewer_id is not None and any(m["profile_id"] == viewer_id for m in w.members.get(project_id, []))
    out.update({
        "readme_md": p.get("readme_md"), "repo_url": p.get("repo_url"), "demo_url": p.get("demo_url"),
        "has_source": bool(p.get("source_zip_path")), "members": members(w, project_id, on_team),
        "viewer_follows_owner": p["owner_id"] in w.follows.get(viewer_id, ()),
    })
    return out
