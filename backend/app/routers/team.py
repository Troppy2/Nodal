from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client
from ..deps import get_current_user
from ..models import ShareIn, TeamOut
from ..services.cards import profile_lite, profiles_by_id, skill_out, skills_by_id

router = APIRouter()


def _project(project_id: str) -> dict:
    rows = service_client().table("projects").select("id,owner_id").eq("id", project_id).execute().data
    if not rows:
        raise HTTPException(404, "Project not found")
    return rows[0]


def _team(project_id: str) -> dict:
    rows = service_client().table("project_members").select("*").eq("project_id", project_id).order("created_at").execute().data
    people = profiles_by_id(r["profile_id"] for r in rows)
    skills = skills_by_id()
    members = [{
        "profile": profile_lite(people[r["profile_id"]]), "role": r["role"],
        "skill": skill_out(skills[r["skill_id"]]) if r.get("skill_id") else None,
        "share_bps": r.get("share_bps"), "status": r["status"],
    } for r in rows if r["profile_id"] in people]
    members.sort(key=lambda m: m["role"] != "owner")
    return {"members": members, "total_bps": sum(r.get("share_bps") or 0 for r in rows)}


@router.get("/projects/{project_id}/team", response_model=TeamOut)
def team(project_id: str, user: dict = Depends(get_current_user)):
    project = _project(project_id)
    is_member = service_client().table("project_members").select("profile_id").eq("project_id", project_id) \
        .eq("profile_id", user["id"]).execute().data
    if project["owner_id"] != user["id"] and not is_member:
        raise HTTPException(403, "Only team members can see the team")
    return _team(project_id)


@router.patch("/projects/{project_id}/team/{profile_id}", response_model=TeamOut)
def set_share(project_id: str, profile_id: str, body: ShareIn, user: dict = Depends(get_current_user)):
    project = _project(project_id)
    if project["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can set shares")
    sb = service_client()
    rows = sb.table("project_members").select("profile_id,share_bps").eq("project_id", project_id).execute().data
    if profile_id not in {r["profile_id"] for r in rows}:
        raise HTTPException(404, "Not a member of this project")
    others = sum(r["share_bps"] or 0 for r in rows if r["profile_id"] != profile_id)
    if others + body.share_bps > 10000:
        raise HTTPException(422, f"Shares would total {(others + body.share_bps) / 100:g}%. Keep them at or under 100%.")
    sb.table("project_members").update({"share_bps": body.share_bps}).eq("project_id", project_id).eq("profile_id", profile_id).execute()
    return _team(project_id)
