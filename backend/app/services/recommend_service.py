"""For-you ranking (docs/BACKEND.md "Recommendations"). Reuses the matching snapshot so skill fit is computed once."""

from datetime import datetime, timezone

from ..db import service_client
from .matching import Snapshot

# Added to every skill-fit score while sorting, so a tag-only candidate can never outrank a skill fit.
FIT_TIER = 10_000


def _age_days(created_at: str) -> float:
    ts = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return max(0.0, (datetime.now(timezone.utc) - ts).total_seconds() / 86400)


def excluded_for(viewer_id: str) -> set[str]:
    """Projects a viewer already asked to join or dismissed."""
    sb = service_client()
    asked = sb.table("collab_requests").select("project_id").eq("from_profile_id", viewer_id).execute().data
    dismissed = sb.table("recommendation_dismissals").select("project_id").eq("profile_id", viewer_id).execute().data
    return {r["project_id"] for r in asked} | {r["project_id"] for r in dismissed}


def recommend(snap: Snapshot, viewer_id: str, stage: str = "any", limit: int = 20,
              exclude: set[str] | None = None) -> list[dict]:
    """Ranked [{project_id, score, sort_key, reasons}] for the viewer."""
    exclude = excluded_for(viewer_id) if exclude is None else exclude
    my_projects = set(snap.owned.get(viewer_id, []))
    my_types = {snap.projects[p]["type"] for p in my_projects}
    my_tags = snap.interests.get(viewer_id, set()) | snap.profile_tags(viewer_id)
    my_offers = snap.offers.get(viewer_id, {})
    with_needs = {n["project_id"] for n in snap.needs}
    swap_partners = {v for v in snap.adj.get(viewer_id, {}) if viewer_id in snap.adj.get(v, {})}

    out = []
    for pid, p in snap.projects.items():
        if pid in my_projects or pid in exclude or pid not in with_needs:
            continue
        if stage != "any" and p["stage"] != stage:
            continue
        fit_needs = [n for n in snap.needs if n["project_id"] == pid and n["skill_id"] in my_offers]
        shared = (snap.tags.get(pid, set()) & my_tags)
        if not fit_needs and not shared:
            continue
        reasons: list[str] = []
        score = 0
        if fit_needs:
            best = max(fit_needs, key=lambda n: my_offers[n["skill_id"]])
            level = my_offers[best["skill_id"]]
            score += 50 + 10 * (level - 1)
            reasons.append(f"Needs {snap.skills[best['skill_id']]['name']}, which you offer at level {level}")
        score += 5 * min(len(shared), 3)
        for t in sorted(shared)[:2]:
            reasons.append(f"Shares tag {t}")
        if my_types and p["type"] not in my_types:
            score += 15
            reasons.append("Different from what you usually build")
        score += round(10 * max(0.0, 1 - _age_days(p["created_at"]) / 30))
        if p["owner_id"] in swap_partners:
            score += 25
            reasons.append("Swap: you can help each other")
        out.append({"project_id": pid, "score": score, "reasons": reasons,
                    "sort_key": score + (FIT_TIER if fit_needs else 0)})
    out.sort(key=lambda r: -r["sort_key"])
    return out[:limit]
