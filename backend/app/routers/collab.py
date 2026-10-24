from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client, user_client
from ..deps import get_current_user
from ..models import CollabIn, CollabOut, RespondIn
from ..services.cards import profile_lite, profiles_by_id, skill_out, skills_by_id
from .projects import get_project_row

router = APIRouter()


def collab_out(rows: list[dict]) -> list[dict]:
    """CollabOut payloads for raw collab_requests rows."""
    if not rows:
        return []
    sb = service_client()
    projects = {p["id"]: p for p in sb.table("projects").select("id,title,type,owner_id")
                .in_("id", list({r["project_id"] for r in rows})).execute().data}
    people = profiles_by_id([r["from_profile_id"] for r in rows] + [p["owner_id"] for p in projects.values()])
    skills = skills_by_id()
    out = []
    for r in rows:
        p = projects.get(r["project_id"])
        if not p or r["from_profile_id"] not in people:
            continue
        out.append({
            "id": r["id"],
            "project": {"id": p["id"], "title": p["title"], "type": p["type"], "owner": profile_lite(people[p["owner_id"]])},
            "from_profile": profile_lite(people[r["from_profile_id"]]),
            "skill": skill_out(skills[r["skill_id"]]), "message": r.get("message"), "status": r["status"],
            "created_at": r["created_at"],
        })
    return out


@router.post("/projects/{project_id}/collab-requests", response_model=CollabOut, status_code=201)
def create_request(project_id: str, body: CollabIn, user: dict = Depends(get_current_user)):
    project = get_project_row(project_id)
    if project["owner_id"] == user["id"]:
        raise HTTPException(409, "You own this project")
    sb = service_client()
    need = sb.table("project_needs").select("id").eq("project_id", project_id).eq("skill_id", body.skill_id) \
        .eq("status", "open").execute().data
    if not need:
        raise HTTPException(422, "That skill isn't an open need on this project")
    dup = sb.table("collab_requests").select("id").eq("project_id", project_id).eq("from_profile_id", user["id"]) \
        .eq("skill_id", body.skill_id).eq("status", "pending").execute().data
    if dup:
        raise HTTPException(409, "You already asked to help with this")
    row = user_client(user["jwt"]).table("collab_requests").insert({
        "project_id": project_id, "from_profile_id": user["id"], "skill_id": body.skill_id,
        "message": (body.message or "").strip()[:1000] or None,
    }).execute().data[0]
    return collab_out([row])[0]


@router.get("/me/collab-requests")
def my_requests(user: dict = Depends(get_current_user)) -> dict[str, list[CollabOut]]:
    sb = service_client()
    mine = [p["id"] for p in sb.table("projects").select("id").eq("owner_id", user["id"]).execute().data]
    incoming = (sb.table("collab_requests").select("*").in_("project_id", mine).order("created_at", desc=True).execute().data
                if mine else [])
    outgoing = sb.table("collab_requests").select("*").eq("from_profile_id", user["id"]) \
        .order("created_at", desc=True).execute().data
    return {"incoming": collab_out(incoming), "outgoing": collab_out(outgoing)}


@router.post("/collab-requests/{request_id}/respond", response_model=CollabOut)
def respond(request_id: str, body: RespondIn, user: dict = Depends(get_current_user)):
    sb = service_client()
    rows = sb.table("collab_requests").select("*").eq("id", request_id).execute().data
    if not rows:
        raise HTTPException(404, "Request not found")
    req = rows[0]
    project = get_project_row(req["project_id"])
    if project["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can respond")
    if req["status"] != "pending":
        raise HTTPException(409, f"Already {req['status']}")

    updated = user_client(user["jwt"]).table("collab_requests").update({"status": body.status}) \
        .eq("id", request_id).eq("status", "pending").execute().data
    if not updated:
        raise HTTPException(409, "Request changed, reload and try again")

    if body.status == "accepted":
        existing = sb.table("project_members").select("profile_id").eq("project_id", project["id"]) \
            .eq("profile_id", req["from_profile_id"]).execute().data
        if not existing:
            sb.table("project_members").insert({
                "project_id": project["id"], "profile_id": req["from_profile_id"], "role": "contributor",
                "skill_id": req["skill_id"], "status": "joined",
            }).execute()
        need = sb.table("project_needs").select("id,bounty_tolken").eq("project_id", project["id"]) \
            .eq("skill_id", req["skill_id"]).execute().data
        if need and need[0].get("bounty_tolken"):
            sb.table("tolken_ledger").insert({
                "project_id": project["id"], "need_id": need[0]["id"], "owner_id": user["id"],
                "contributor_id": req["from_profile_id"], "amount_tolken": need[0]["bounty_tolken"],
                "status": "pending_funding",
            }).execute()
    return collab_out(updated)[0]
