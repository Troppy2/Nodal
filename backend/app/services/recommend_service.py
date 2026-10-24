"""For-you ranking (docs/BACKEND.md "Recommendations").

Candidates are other people's projects with open needs that the viewer hasn't asked to join or
dismissed, and that either need a skill the viewer offers or share a tag with the viewer's interests
and projects. Score: skill fit 50 (+10 per level above 1), +5 per shared tag (max 3), +15 for a type the
viewer doesn't usually build, up to +10 for freshness (fades over 30 days), +25 when the owner is a swap
partner. Any skill fit ranks above every tag-only match.
"""

from datetime import datetime, timezone

from ..world import World

FIT_TIER = 10_000
FRESH_DAYS = 30


def _age_days(created_at: str) -> float:
    ts = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return max(0.0, (datetime.now(timezone.utc) - ts).total_seconds() / 86400)


def recommend(w: World, viewer_id: str, stage: str = "any", limit: int = 20) -> list[dict]:
    """Ranked [{project_id, score, reasons}] for the viewer."""
    m = w.matching
    mine = set(w.owned.get(viewer_id, []))
    excluded = mine | {pid for pid, _ in w.requested.get(viewer_id, ())} | w.dismissed.get(viewer_id, set())
    my_types = {w.projects[p]["type"] for p in mine}
    my_tags = w.interests.get(viewer_id, set()) | m.profile_tags(viewer_id)
    my_offers = w.offers.get(viewer_id, {})
    partners = m.swap_partners(viewer_id)
    open_by_project: dict[str, list[dict]] = {}
    for n in w.open_needs:
        open_by_project.setdefault(n["project_id"], []).append(n)

    ranked = []
    for pid, needs in open_by_project.items():
        p = w.projects[pid]
        if pid in excluded or (stage != "any" and p["stage"] != stage):
            continue
        fits = [n for n in needs if n["skill_id"] in my_offers]
        shared = w.tags.get(pid, set()) & my_tags
        if not fits and not shared:
            continue
        score, reasons = 0, []
        if fits:
            best = max(fits, key=lambda n: my_offers[n["skill_id"]])
            level = my_offers[best["skill_id"]]
            score += 50 + 10 * (level - 1)
            reasons.append(f"Needs {w.skills[best['skill_id']]['name']}, which you offer at level {level}")
        score += 5 * min(len(shared), 3)
        reasons += [f"Shares tag {t}" for t in sorted(shared)[:2]]
        if my_types and p["type"] not in my_types:
            score += 15
            reasons.append("Different from what you usually build")
        score += round(10 * max(0.0, 1 - _age_days(p["created_at"]) / FRESH_DAYS))
        if p["owner_id"] in partners:
            score += 25
            reasons.append("Swap: you can help each other")
        ranked.append((score + (FIT_TIER if fits else 0), {"project_id": pid, "score": score, "reasons": reasons}))
    ranked.sort(key=lambda r: -r[0])
    return [r for _, r in ranked[:limit]]
