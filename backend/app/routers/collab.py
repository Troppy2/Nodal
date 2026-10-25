"""Requests to help on a project need. Accepting one adds the helper to the team and, when the need
has a bounty, opens a pending Tolken ledger entry for the owner to fund."""

from fastapi import APIRouter, Depends, HTTPException

from ..db import parallel, service_client, user_client
from ..deps import get_current_user
from ..models import CollabIn, CollabOut, RespondIn
from ..ratelimit import rate_limit
from ..services.cards import profile_lite, skill_out
from ..world import world
from .projects import project_row

router = APIRouter()
MAX_MESSAGE = 1000


def collab_out(rows: list[dict]) -> list[dict]:
    """CollabOut payloads for collab_requests rows; rows whose project or people are gone are skipped."""
    w = world()
    projects = {pid: w.projects[pid] for pid in {r["project_id"] for r in rows} if pid in w.projects}
    people = w.people([r["from_profile_id"] for r in rows] + [p["owner_id"] for p in projects.values()])
    out = []
    for r in rows:
        p = projects.get(r["project_id"])
        if not p or r["from_profile_id"] not in people or p["owner_id"] not in people:
            continue
        out.append({
            "id": r["id"],
            "project": {"id": p["id"], "title": p["title"], "type": p["type"], "owner": profile_lite(people[p["owner_id"]])},
            "from_profile": profile_lite(people[r["from_profile_id"]]),
            "skill": skill_out(w.skills[r["skill_id"]]), "message": r.get("message"), "status": r["status"],
            "created_at": r["created_at"],
        })
    return out


@router.post("/projects/{project_id}/collab-requests", response_model=CollabOut, status_code=201)
def create_request(project_id: str, body: CollabIn, user: dict = Depends(rate_limit("10/minute", "collab"))):
    project = project_row(project_id)
    if project["owner_id"] == user["id"]:
        raise HTTPException(409, "You own this project")
    t = service_client().table
    need, pending = parallel(
        lambda: t("project_needs").select("id").eq("project_id", project_id).eq("skill_id", body.skill_id)
        .eq("status", "open").execute().data,
        lambda: t("collab_requests").select("id").eq("project_id", project_id).eq("from_profile_id", user["id"])
        .eq("skill_id", body.skill_id).eq("status", "pending").execute().data,
    )
    if not need:
        raise HTTPException(422, "That skill isn't an open need on this project")
    if pending:
        raise HTTPException(409, "You already asked to help with this")
    row = user_client(user["jwt"]).table("collab_requests").insert({
        "project_id": project_id, "from_profile_id": user["id"], "skill_id": body.skill_id,
        "message": (body.message or "").strip()[:MAX_MESSAGE] or None,
    }).execute().data[0]
    return collab_out([row])[0]


def requests_involving(user_id: str) -> tuple[list[dict], list[dict]]:
    """(incoming on my projects, outgoing from me), newest first. Ownership comes live, not from the world."""
    t = service_client().table
    mine = [p["id"] for p in t("projects").select("id").eq("owner_id", user_id).execute().data]
    incoming, outgoing = parallel(
        lambda: t("collab_requests").select("*").in_("project_id", mine).order("created_at", desc=True).execute().data
        if mine else [],
        lambda: t("collab_requests").select("*").eq("from_profile_id", user_id).order("created_at", desc=True).execute().data,
    )
    return incoming, outgoing


@router.get("/me/collab-requests")
def my_requests(user: dict = Depends(get_current_user)) -> dict[str, list[CollabOut]]:
    incoming, outgoing = requests_involving(user["id"])
    return {"incoming": collab_out(incoming), "outgoing": collab_out(outgoing)}


@router.post("/collab-requests/{request_id}/respond", response_model=CollabOut)
def respond(request_id: str, body: RespondIn, user: dict = Depends(get_current_user)):
    sb = service_client()
    rows = sb.table("collab_requests").select("*").eq("id", request_id).execute().data
    if not rows:
        raise HTTPException(404, "Request not found")
    req = rows[0]
    project = project_row(req["project_id"])
    if project["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can respond")
    if req["status"] != "pending":
        raise HTTPException(409, f"Already {req['status']}")
    # conditional on still pending, so a double click can't accept twice
    updated = user_client(user["jwt"]).table("collab_requests").update({"status": body.status}) \
        .eq("id", request_id).eq("status", "pending").execute().data
    if not updated:
        raise HTTPException(409, "Request changed, reload and try again")

    if body.status == "accepted":
        member, need = parallel(
            lambda: sb.table("project_members").select("profile_id").eq("project_id", project["id"])
            .eq("profile_id", req["from_profile_id"]).execute().data,
            lambda: sb.table("project_needs").select("id,bounty_tolken").eq("project_id", project["id"])
            .eq("skill_id", req["skill_id"]).execute().data,
        )
        if not member:
            sb.table("project_members").insert({
                "project_id": project["id"], "profile_id": req["from_profile_id"], "role": "contributor",
                "skill_id": req["skill_id"], "status": "joined",
            }).execute()
        if need and need[0].get("bounty_tolken"):
            sb.table("tolken_ledger").insert({
                "project_id": project["id"], "need_id": need[0]["id"], "owner_id": user["id"],
                "contributor_id": req["from_profile_id"], "amount_tolken": need[0]["bounty_tolken"],
                "status": "pending_funding",
            }).execute()
    return collab_out(updated)[0]

@router.get("/projects/{project_id}/collab-requests", response_model=list[CollabOut])
def project_requests(project_id: str, user: dict = Depends(get_current_user)):
    project = project_row(project_id)
    if project["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can view requests")
    rows = service_client().table("collab_requests").select("*").eq("project_id", project_id).order("created_at", desc=True).execute().data
    return collab_out(rows)

