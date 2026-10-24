"""Team list and revenue shares. Shares are team-only and read live."""

from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client
from ..deps import get_current_user
from ..models import ShareIn, TeamOut
from ..services.cards import profile_lite, skill_out
from ..services.tolken_service import FULL_SHARES
from ..world import world
from .projects import project_row

router = APIRouter()


def _rows(project_id: str) -> list[dict]:
    return service_client().table("project_members").select("*").eq("project_id", project_id).order("created_at").execute().data


def _team(rows: list[dict]) -> dict:
    w = world()
    people = w.people(r["profile_id"] for r in rows)
    members = [{
        "profile": profile_lite(people[r["profile_id"]]), "role": r["role"],
        "skill": skill_out(w.skills[r["skill_id"]]) if r.get("skill_id") else None,
        "share_bps": r.get("share_bps"), "status": r["status"],
    } for r in sorted(rows, key=lambda r: r["role"] != "owner") if r["profile_id"] in people]
    return {"members": members, "total_bps": sum(r.get("share_bps") or 0 for r in rows)}


@router.get("/projects/{project_id}/team", response_model=TeamOut)
def team(project_id: str, user: dict = Depends(get_current_user)):
    project = project_row(project_id)
    rows = _rows(project_id)
    if project["owner_id"] != user["id"] and all(r["profile_id"] != user["id"] for r in rows):
        raise HTTPException(403, "Only team members can see the team")
    return _team(rows)


@router.patch("/projects/{project_id}/team/{profile_id}", response_model=TeamOut)
def set_share(project_id: str, profile_id: str, body: ShareIn, user: dict = Depends(get_current_user)):
    if project_row(project_id)["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can set shares")
    rows = _rows(project_id)
    if profile_id not in {r["profile_id"] for r in rows}:
        raise HTTPException(404, "Not a member of this project")
    total = body.share_bps + sum(r["share_bps"] or 0 for r in rows if r["profile_id"] != profile_id)
    if total > FULL_SHARES:
        raise HTTPException(422, f"Shares would total {total / 100:g}%. Keep them at or under 100%.")
    service_client().table("project_members").update({"share_bps": body.share_bps}) \
        .eq("project_id", project_id).eq("profile_id", profile_id).execute()
    for r in rows:
        if r["profile_id"] == profile_id:
            r["share_bps"] = body.share_bps
    return _team(rows)
