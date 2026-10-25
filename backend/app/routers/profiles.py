import re
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError

from ..db import service_client
from ..deps import get_optional_user
from ..models import ActivityDay, ProfileLite, ProfileOut
from ..services.cards import cards, profile_lite, skill_out
from ..world import PROFILE_COLS, World, world

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


@router.get("/profiles", response_model=list[ProfileLite])
def search_profiles(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=50),
    viewer: dict | None = Depends(get_optional_user),
):
    """Search profiles by handle or display name for mentions or autocomplete. Excludes viewer."""
    w = world()
    viewer_id = viewer and viewer["id"]
    needle = q.strip().lower().lstrip("@")

    candidates: list[tuple[int, str, dict]] = []
    for p in w.profiles.values():
        if viewer_id and p["id"] == viewer_id:
            continue
        handle = (p.get("handle") or "").lower()
        name = (p.get("display_name") or "").lower()
        if not needle:
            candidates.append((0, handle, p))
        elif handle == needle:
            candidates.append((1, handle, p))
        elif handle.startswith(needle):
            candidates.append((2, handle, p))
        elif needle in handle:
            candidates.append((3, handle, p))
        elif name.startswith(needle) or needle in name:
            candidates.append((4, handle, p))

    candidates.sort(key=lambda x: (x[0], x[1]))
    results = [profile_lite(item[2]) for item in candidates[:limit]]

    # PostgREST filter grammar treats , ( ) . : * % " as syntax, so only plain characters reach the query.
    safe = re.sub(r"[^a-z0-9_\- ]", "", needle)
    if len(results) < limit and safe:
        seen = {r["id"] for r in results}
        if viewer_id:
            seen.add(viewer_id)
        try:
            db_profiles = (
                service_client()
                .table("profiles")
                .select(PROFILE_COLS)
                .or_(f"handle.ilike.%{safe}%,display_name.ilike.%{safe}%")
                .limit(limit)
                .execute()
                .data
            )
            for p in db_profiles:
                if p["id"] not in seen:
                    results.append(profile_lite(p))
                    seen.add(p["id"])
                    if len(results) >= limit:
                        break
        except Exception:
            pass

    return results


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
    try:
        rows = (service_client().table("project_needs").select("completed_at")
                .eq("completed_by", pid).gte("completed_at", since).execute().data)
    except APIError as e:      # completion migration not applied yet: fall back to paid bounties
        if e.code != "42703":
            raise
        rows = [{"completed_at": r["updated_at"]} for r in service_client().table("tolken_ledger").select("updated_at")
                .eq("contributor_id", pid).eq("status", "released").gte("updated_at", since).execute().data]
    days = Counter(r["completed_at"][:10] for r in rows)
    return [{"date": d, "count": c} for d, c in sorted(days.items())]
