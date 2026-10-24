"""Builds ProjectCard / ProjectDetail payloads. Every list endpoint goes through `load_cards`,
which batches its reads so a page of cards costs a fixed handful of queries."""

import hashlib
from collections import Counter, defaultdict

from ..db import service_client

PATTERNS = ["rings", "bars", "blocks", "stripes", "dots"]
VERDICT_LABEL = {"promising": "Promising", "mixed": "Mixed", "weak": "Weak", "not_enough_evidence": "Not enough evidence"}


def cover_for(project_id: str, type_: str) -> dict:
    """Deterministic cover when there is no cover_url: pattern from a hash of the id, tint from the type."""
    h = int(hashlib.sha1(project_id.encode()).hexdigest(), 16)
    return {"pattern": PATTERNS[h % len(PATTERNS)], "tint": type_}


def profile_lite(p: dict) -> dict:
    return {"id": p["id"], "handle": p["handle"], "display_name": p.get("display_name"), "avatar_url": p.get("avatar_url")}


def skill_out(s: dict) -> dict:
    return {"id": s["id"], "name": s["name"], "slug": s["slug"], "category": s["category"]}


def profiles_by_id(ids) -> dict[str, dict]:
    ids = list({i for i in ids if i})
    if not ids:
        return {}
    rows = service_client().table("profiles").select("id,handle,display_name,avatar_url").in_("id", ids).execute().data
    return {r["id"]: r for r in rows}


def skills_by_id() -> dict[int, dict]:
    return {s["id"]: s for s in service_client().table("skills").select("*").execute().data}


def load_cards(project_ids: list[str], viewer_id: str | None = None, detail: bool = False) -> list[dict]:
    """Cards for these projects, in the given order. Missing ids are skipped."""
    if not project_ids:
        return []
    sb = service_client()
    cols = "*" if detail else "id,owner_id,type,title,summary,stage,source_access,cover_url,created_at"
    projects = {p["id"]: p for p in sb.table("projects").select(cols).in_("id", project_ids).execute().data}
    if not projects:
        return []
    ids = list(projects)

    needs = sb.table("project_needs").select("*").in_("project_id", ids).order("id").execute().data
    tags = sb.table("project_tags").select("*").in_("project_id", ids).execute().data
    stars = sb.table("project_stars").select("project_id,profile_id").in_("project_id", ids).execute().data
    comments = sb.table("comments").select("project_id").in_("project_id", ids).execute().data
    skills = skills_by_id()

    need_skill_ids = list({n["skill_id"] for n in needs})
    offers = (
        sb.table("profile_offers").select("profile_id,skill_id").in_("skill_id", need_skill_ids).eq("available", True).execute().data
        if need_skill_ids else []
    )
    offerers_by_skill: dict[int, list[str]] = defaultdict(list)
    for o in offers:
        offerers_by_skill[o["skill_id"]].append(o["profile_id"])

    requested: set[tuple[str, int]] = set()
    if viewer_id:
        rows = sb.table("collab_requests").select("project_id,skill_id").eq("from_profile_id", viewer_id).in_("project_id", ids).execute().data
        requested = {(r["project_id"], r["skill_id"]) for r in rows}

    runs = (
        sb.table("research_runs").select("project_id,report,cool,is_public,requested_by,status,created_at")
        .in_("project_id", ids).in_("status", ["done", "partial"]).order("created_at", desc=True).execute().data
    )
    latest_run: dict[str, dict] = {}
    for r in runs:
        if (r["is_public"] or r["requested_by"] == viewer_id) and r["project_id"] not in latest_run:
            latest_run[r["project_id"]] = r

    people = profiles_by_id([p["owner_id"] for p in projects.values()] + [o["profile_id"] for o in offers])
    star_count = Counter(s["project_id"] for s in stars)
    viewer_starred = {s["project_id"] for s in stars if s["profile_id"] == viewer_id}
    comment_count = Counter(c["project_id"] for c in comments)
    tags_by = defaultdict(list)
    for t in tags:
        tags_by[t["project_id"]].append(t["tag"])
    needs_by = defaultdict(list)
    for n in needs:
        needs_by[n["project_id"]].append(n)

    out = []
    for pid in project_ids:
        p = projects.get(pid)
        if not p:
            continue
        fit_people: set[str] = set()
        need_out = []
        for n in needs_by[pid]:
            fitter_ids = [i for i in offerers_by_skill[n["skill_id"]] if i != p["owner_id"]]
            fitter_ids.sort(key=lambda i: (i != viewer_id, people.get(i, {}).get("handle", "")))
            if n["status"] == "open":
                fit_people.update(fitter_ids)
            need_out.append({
                "id": n["id"], "skill": skill_out(skills[n["skill_id"]]), "note": n.get("note"),
                "bounty_tolken": n.get("bounty_tolken"), "status": n["status"],
                "fitters": [profile_lite(people[i]) for i in fitter_ids[:5] if i in people],
                "viewer_fits": bool(viewer_id) and viewer_id != p["owner_id"] and viewer_id in fitter_ids,
                "viewer_requested": (pid, n["skill_id"]) in requested,
            })
        run = latest_run.get(pid) if p["stage"] == "idea" else None
        report, cool = (run or {}).get("report") or {}, (run or {}).get("cool") or {}
        card = {
            "id": pid, "title": p["title"], "summary": p["summary"], "type": p["type"], "stage": p["stage"],
            "source_access": p["source_access"], "cover": cover_for(pid, p["type"]), "cover_url": p.get("cover_url"),
            "owner": profile_lite(people[p["owner_id"]]), "tags": sorted(tags_by[pid]), "needs": need_out,
            "star_count": star_count[pid], "comment_count": comment_count[pid], "people_fit": len(fit_people),
            "badges": {"market_verdict": VERDICT_LABEL.get(report.get("verdict")), "cool_score": cool.get("overall")},
            "viewer_starred": pid in viewer_starred, "created_at": p["created_at"],
        }
        if detail:
            card.update({"readme_md": p.get("readme_md"), "repo_url": p.get("repo_url"), "demo_url": p.get("demo_url"),
                         "has_source": bool(p.get("source_zip_path"))})
        out.append(card)
    return out
