from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import service_client
from ..deps import get_optional_user
from ..models import ActivityDay, ProfileOut
from ..services.cards import cards, profile_lite, skill_out
from ..world import World, world

router = APIRouter()


def offers_out(skills: dict[int, dict], offers: dict[int, int]) -> list[dict]:
    """Offers, strongest first, then by skill name."""
    rows = [{"skill": skill_out(skills[s]), "level": lvl} for s, lvl in offers.items() if s in skills]
    return sorted(rows, key=lambda o: (-o["level"], o["skill"]["name"]))


def _profile_id(w: World, handle: str) -> str:
    pid = w.by_handle.get(handle)
    if pid is None:
        raise HTTPException(404, "Profile not found")
    return pid


def _joined_contributors(w: World, project_id: str) -> list[dict]:
    return [m for m in w.members.get(project_id, []) if m["role"] == "contributor" and m["status"] == "joined"]


@router.get("/profiles/{handle}", response_model=ProfileOut)
def get_profile(handle: str, viewer: dict | None = Depends(get_optional_user)):
    w = world()
    pid = _profile_id(w, handle)
    p = w.profiles[pid]
    viewer_id = viewer and viewer["id"]
    owned = w.owned.get(pid, [])
    helped_elsewhere = sum(1 for proj in w.projects for m in _joined_contributors(w, proj) if m["profile_id"] == pid)
    helpers_on_mine = sum(len(_joined_contributors(w, proj)) for proj in owned)
    return {
        "profile": profile_lite(p), "bio": p.get("bio"), "interests": p.get("interests") or [],
        "offers": offers_out(w.skills, w.offers.get(pid, {})),
        "stats": {"projects": len(owned), "stars": sum(len(w.stars.get(proj, ())) for proj in owned),
                  "collaborations": helped_elsewhere + helpers_on_mine, "followers": len(w.followers.get(pid, ()))},
        "projects": cards(w, owned, viewer_id),
        "viewer_follows": viewer_id in w.followers.get(pid, ()),
        "is_me": viewer_id == pid,
    }


@router.get("/profiles/{handle}/activity", response_model=list[ActivityDay])
def activity(handle: str, weeks: int = Query(52, ge=1, le=53)):
    """Contributions per day: needs this person completed, dated by when the owner confirmed them
    (with or without a Tolken bounty)."""
    pid = _profile_id(world(), handle)
    since = (datetime.now(timezone.utc) - timedelta(weeks=weeks)).isoformat()
    rows = (service_client().table("project_needs").select("completed_at")
            .eq("completed_by", pid).gte("completed_at", since).execute().data)
    days = Counter(r["completed_at"][:10] for r in rows)
    return [{"date": d, "count": c} for d, c in sorted(days.items())]
