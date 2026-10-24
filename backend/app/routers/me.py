import re

from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client, user_client
from ..deps import get_current_user
from ..models import InterestsIn, MeIn, MeOut, OfferIn
from ..services.cards import profile_lite, skills_by_id
from .profiles import offers_for

router = APIRouter()


def _me(user_id: str) -> dict:
    rows = service_client().table("profiles").select("*").eq("id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Profile not found")
    p = rows[0]
    offers = offers_for(user_id)
    return {
        "profile": profile_lite(p), "bio": p.get("bio"), "interests": p.get("interests") or [],
        "offers": offers, "tolken_balance": p["tolken_balance"], "onboarded": bool(offers),
    }


def _unique_handle(name: str, user_id: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:24] or "builder"
    if len(base) < 2:
        base = f"{base}-x"
    sb = service_client()
    taken = {r["handle"] for r in sb.table("profiles").select("handle").like("handle", f"{base}%").neq("id", user_id).execute().data}
    if base not in taken:
        return base
    n = 2
    while f"{base}-{n}" in taken:
        n += 1
    return f"{base}-{n}"


@router.get("/me", response_model=MeOut)
def get_me(user: dict = Depends(get_current_user)):
    return _me(user["id"])


@router.patch("/me", response_model=MeOut)
def patch_me(body: MeIn, user: dict = Depends(get_current_user)):
    changes = body.model_dump(exclude_unset=True)
    if "display_name" in changes:
        changes["display_name"] = changes["display_name"].strip()
    current = service_client().table("profiles").select("handle").eq("id", user["id"]).execute().data
    if "handle" not in changes and changes.get("display_name") and current and current[0]["handle"].startswith("user-"):
        changes["handle"] = _unique_handle(changes["display_name"], user["id"])
    if "handle" in changes:
        clash = service_client().table("profiles").select("id").eq("handle", changes["handle"]).neq("id", user["id"]).execute().data
        if clash:
            raise HTTPException(409, "That handle is taken")
    if changes:
        user_client(user["jwt"]).table("profiles").update(changes).eq("id", user["id"]).execute()
    return _me(user["id"])


@router.put("/me/offers", response_model=MeOut)
def put_offers(body: list[OfferIn], user: dict = Depends(get_current_user)):
    valid = set(skills_by_id())
    seen = {}
    for o in body:
        if o.skill_id not in valid:
            raise HTTPException(422, f"Unknown skill {o.skill_id}")
        seen[o.skill_id] = o.level
    if len(seen) > 20:
        raise HTTPException(422, "Up to 20 skills")
    sb = user_client(user["jwt"])
    sb.table("profile_offers").delete().eq("profile_id", user["id"]).execute()
    if seen:
        sb.table("profile_offers").insert(
            [{"profile_id": user["id"], "skill_id": s, "level": lvl} for s, lvl in seen.items()]
        ).execute()
    return _me(user["id"])


@router.put("/me/interests", response_model=MeOut)
def put_interests(body: InterestsIn, user: dict = Depends(get_current_user)):
    tags = []
    for t in body.interests:
        t = re.sub(r"[^a-z0-9-]+", "-", t.strip().lower()).strip("-")[:30]
        if t and t not in tags:
            tags.append(t)
    user_client(user["jwt"]).table("profiles").update({"interests": tags}).eq("id", user["id"]).execute()
    return _me(user["id"])
