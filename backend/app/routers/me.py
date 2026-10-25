"""The signed-in person: profile, onboarding (offers and interests), and profile edits.
Always read live, so a change shows in the very response that made it."""

import re

from fastapi import APIRouter, Depends, HTTPException

from ..db import parallel, service_client, user_client
from ..deps import get_current_user
from ..handles import PLACEHOLDER_PREFIX, handle_taken, unique_handle
from ..models import InterestsIn, MeIn, MeOut, MyProjectsOut, OfferIn
from ..services.cards import cards, profile_lite, skill_out
from ..world import world
from .profiles import offers_out

router = APIRouter()
MAX_OFFERS = 20
MAX_TAG_LEN = 30


def _me(user_id: str) -> dict:
    t = service_client().table
    profiles, offers = parallel(
        lambda: t("profiles").select("*").eq("id", user_id).execute().data,
        lambda: t("profile_offers").select("skill_id,level").eq("profile_id", user_id).execute().data,
    )
    if not profiles:
        raise HTTPException(404, "Profile not found")
    p = profiles[0]
    out = offers_out(world().skills, {o["skill_id"]: o["level"] for o in offers})
    return {"profile": profile_lite(p), "bio": p.get("bio"), "interests": p.get("interests") or [],
            "offers": out, "tolken_balance": p["tolken_balance"], "onboarded": bool(out)}


@router.get("/me", response_model=MeOut)
def get_me(user: dict = Depends(get_current_user)):
    return _me(user["id"])


@router.patch("/me", response_model=MeOut)
def patch_me(body: MeIn, user: dict = Depends(get_current_user)):
    """Naming yourself during onboarding also replaces the placeholder handle."""
    changes = body.model_dump(exclude_unset=True)
    if changes.get("display_name"):
        changes["display_name"] = changes["display_name"].strip()
        if "handle" not in changes:
            current = service_client().table("profiles").select("handle").eq("id", user["id"]).execute().data
            if current and current[0]["handle"].startswith(PLACEHOLDER_PREFIX):
                changes["handle"] = unique_handle(changes["display_name"], exclude_id=user["id"])
    if "handle" in changes and handle_taken(changes["handle"], user["id"]):
        raise HTTPException(409, "That handle is taken")
    if changes:
        user_client(user["jwt"]).table("profiles").update(changes).eq("id", user["id"]).execute()
    return _me(user["id"])


@router.put("/me/offers", response_model=MeOut)
def put_offers(body: list[OfferIn], user: dict = Depends(get_current_user)):
    """Replaces every offer. A repeated skill keeps its last level."""
    skills = world().skills
    levels: dict[int, int] = {}
    for o in body:
        if o.skill_id not in skills:
            raise HTTPException(422, f"Unknown skill {o.skill_id}")
        levels[o.skill_id] = o.level
    if len(levels) > MAX_OFFERS:
        raise HTTPException(422, f"Up to {MAX_OFFERS} skills")
    sb = user_client(user["jwt"])
    sb.table("profile_offers").delete().eq("profile_id", user["id"]).execute()
    if levels:
        sb.table("profile_offers").insert(
            [{"profile_id": user["id"], "skill_id": s, "level": lvl} for s, lvl in levels.items()]).execute()
    return _me(user["id"])


@router.put("/me/interests", response_model=MeOut)
def put_interests(body: InterestsIn, user: dict = Depends(get_current_user)):
    """Stored as tags: lowercase, dashes for spaces, no repeats, order kept."""
    tags = [re.sub(r"[^a-z0-9-]+", "-", t.strip().lower()).strip("-")[:MAX_TAG_LEN] for t in body.interests]
    tags = list(dict.fromkeys(t for t in tags if t))
    user_client(user["jwt"]).table("profiles").update({"interests": tags}).eq("id", user["id"]).execute()
    return _me(user["id"])


@router.get("/me/projects", response_model=MyProjectsOut)
def get_my_projects(user: dict = Depends(get_current_user)):
    """All projects the viewer is involved in: owned or contributing (joined as team member)."""
    uid = user["id"]
    w = world()
    t = service_client().table

    # Fetch live project memberships for user to ensure immediate accuracy
    member_rows = t("project_members").select("project_id,role,status,skill_id,share_bps").eq("profile_id", uid).execute().data

    # Owned projects (live from projects table for freshness)
    owned_rows = t("projects").select("id").eq("owner_id", uid).order("created_at", desc=True).execute().data
    owned_ids = [r["id"] for r in owned_rows]

    # Contributing projects (joined members where user is contributor and not owner)
    contributing_ids = [
        m["project_id"] for m in member_rows
        if m.get("role") == "contributor" and m.get("status") == "joined" and m["project_id"] not in owned_ids
    ]

    all_ids = owned_ids + [pid for pid in contributing_ids if pid not in owned_ids]

    memberships = {}
    for m in member_rows:
        pid = m["project_id"]
        sid = m.get("skill_id")
        skill_data = skill_out(w.skills[sid]) if sid and sid in w.skills else None
        memberships[pid] = {
            "role": m.get("role") or "contributor",
            "status": m.get("status") or "joined",
            "share_bps": m.get("share_bps"),
            "skill": skill_data,
        }
    for oid in owned_ids:
        if oid not in memberships:
            memberships[oid] = {
                "role": "owner",
                "status": "joined",
                "share_bps": None,
                "skill": None,
            }

    return {
        "owned": cards(w, owned_ids, uid),
        "contributing": cards(w, contributing_ids, uid),
        "all": cards(w, all_ids, uid),
        "memberships": memberships,
    }
