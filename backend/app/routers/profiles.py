from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import service_client
from ..deps import get_optional_user
from ..models import ActivityDay, ProfileOut
from ..services.cards import load_cards, profile_lite, skill_out, skills_by_id

router = APIRouter()


def profile_by_handle(handle: str) -> dict:
    rows = service_client().table("profiles").select("*").eq("handle", handle).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Profile not found")
    return rows[0]


def offers_for(profile_id: str) -> list[dict]:
    skills = skills_by_id()
    rows = service_client().table("profile_offers").select("skill_id,level").eq("profile_id", profile_id).execute().data
    return sorted(
        ({"skill": skill_out(skills[r["skill_id"]]), "level": r["level"]} for r in rows),
        key=lambda o: (-o["level"], o["skill"]["name"]),
    )


@router.get("/profiles/{handle}", response_model=ProfileOut)
def get_profile(handle: str, viewer: dict | None = Depends(get_optional_user)):
    p = profile_by_handle(handle)
    sb = service_client()
    viewer_id = viewer and viewer["id"]
    projects = sb.table("projects").select("id").eq("owner_id", p["id"]).order("created_at", desc=True).execute().data
    ids = [r["id"] for r in projects]
    stars = len(sb.table("project_stars").select("profile_id").in_("project_id", ids).execute().data) if ids else 0
    contrib = sb.table("project_members").select("project_id").eq("profile_id", p["id"]).eq("role", "contributor") \
        .eq("status", "joined").execute().data
    on_mine = (sb.table("project_members").select("profile_id").in_("project_id", ids).eq("role", "contributor")
               .eq("status", "joined").execute().data if ids else [])
    followers = sb.table("follows").select("follower_id").eq("followee_id", p["id"]).execute().data
    return {
        "profile": profile_lite(p), "bio": p.get("bio"), "interests": p.get("interests") or [],
        "offers": offers_for(p["id"]),
        "stats": {"projects": len(ids), "stars": stars, "collaborations": len(contrib) + len(on_mine),
                  "followers": len(followers)},
        "projects": load_cards(ids, viewer_id),
        "viewer_follows": bool(viewer_id) and any(f["follower_id"] == viewer_id for f in followers),
        "is_me": viewer_id == p["id"],
    }


@router.get("/profiles/{handle}/activity", response_model=list[ActivityDay])
def activity(handle: str, weeks: int = Query(52, ge=1, le=53)):
    p = profile_by_handle(handle)
    sb = service_client()
    since = (datetime.now(timezone.utc) - timedelta(weeks=weeks)).isoformat()
    days: Counter[str] = Counter()
    sources = [
        ("projects", "owner_id"),
        ("comments", "author_id"),
        ("collab_requests", "from_profile_id"),
    ]
    for table, col in sources:
        for r in sb.table(table).select("created_at").eq(col, p["id"]).gte("created_at", since).execute().data:
            days[r["created_at"][:10]] += 1
    for r in sb.table("project_members").select("created_at").eq("profile_id", p["id"]).eq("role", "contributor") \
            .eq("status", "joined").gte("created_at", since).execute().data:
        days[r["created_at"][:10]] += 1
    return [{"date": d, "count": c} for d, c in sorted(days.items())]
