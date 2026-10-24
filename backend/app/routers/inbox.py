from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client
from ..deps import get_current_user
from ..models import CycleInviteIn, InboxItem, InviteRespondIn
from ..services.cards import profile_lite, profiles_by_id, skill_out, skills_by_id
from ..services.graph import cycles_for, link_json
from ..services.matching import Snapshot

router = APIRouter()


def _project_refs(ids) -> dict[str, dict]:
    ids = list({i for i in ids if i})
    if not ids:
        return {}
    rows = service_client().table("projects").select("id,title,type,owner_id").in_("id", ids).execute().data
    owners = profiles_by_id(r["owner_id"] for r in rows)
    return {r["id"]: {"id": r["id"], "title": r["title"], "type": r["type"], "owner": profile_lite(owners[r["owner_id"]])}
            for r in rows if r["owner_id"] in owners}


def _collab_items(me: str) -> list[dict]:
    sb = service_client()
    mine = [p["id"] for p in sb.table("projects").select("id").eq("owner_id", me).execute().data]
    rows = sb.table("collab_requests").select("*").eq("from_profile_id", me).execute().data
    if mine:
        rows += sb.table("collab_requests").select("*").in_("project_id", mine).execute().data
    rows = list({r["id"]: r for r in rows}.values())
    refs = _project_refs(r["project_id"] for r in rows)
    people = profiles_by_id([r["from_profile_id"] for r in rows] + [ref["owner"]["id"] for ref in refs.values()])
    skills = skills_by_id()
    out = []
    for r in rows:
        ref = refs.get(r["project_id"])
        if not ref:
            continue
        incoming = r["from_profile_id"] != me
        other = r["from_profile_id"] if incoming else ref["owner"]["id"]
        out.append({
            "id": r["id"], "kind": "collab", "direction": "incoming" if incoming else "outgoing",
            "created_at": r["created_at"], "people": [profile_lite(people[other])] if other in people else [],
            "project": ref, "skill": skill_out(skills[r["skill_id"]]), "message": r.get("message"),
            "status": r["status"], "actions": ["accept", "decline"] if incoming and r["status"] == "pending" else [],
        })
    return out


def _invite_items(me: str, only: str | None = None) -> list[dict]:
    sb = service_client()
    q = sb.table("cycle_invite_members").select("invite_id").eq("profile_id", me)
    ids = [r["invite_id"] for r in q.execute().data]
    if only:
        ids = [i for i in ids if i == only]
    if not ids:
        return []
    invites = sb.table("cycle_invites").select("*").in_("id", ids).execute().data
    members = sb.table("cycle_invite_members").select("*").in_("invite_id", ids).execute().data
    people = profiles_by_id(m["profile_id"] for m in members)
    out = []
    for inv in invites:
        mem = [m for m in members if m["invite_id"] == inv["id"]]
        responses = {m["profile_id"]: m["response"] for m in mem}
        out.append({
            "id": inv["id"], "kind": inv["kind"], "direction": "outgoing" if inv["created_by"] == me else "incoming",
            "created_at": inv["created_at"],
            "people": [profile_lite(people[m["profile_id"]]) for m in mem if m["profile_id"] != me and m["profile_id"] in people],
            "links": inv["links"], "responses": responses, "status": inv["status"],
            "actions": ["accept", "decline"] if inv["status"] == "pending" and responses.get(me) == "pending" else [],
        })
    return out


@router.get("/me/inbox", response_model=list[InboxItem], response_model_by_alias=True)
def inbox(user: dict = Depends(get_current_user)):
    items = _collab_items(user["id"]) + _invite_items(user["id"])
    return sorted(items, key=lambda i: i["created_at"], reverse=True)


@router.post("/cycles/invite", response_model=InboxItem, response_model_by_alias=True, status_code=201)
def invite(body: CycleInviteIn, user: dict = Depends(get_current_user)):
    """Recomputes my cycles server-side, so only a cycle I am actually in can be invited."""
    snap = Snapshot.load()
    cycle = next((c for c in cycles_for(snap, user["id"], limit=100) if c["id"] == body.cycle_id), None)
    if not cycle:
        raise HTTPException(404, "That swap or ring isn't open to you any more")
    sb = service_client()
    inv = sb.table("cycle_invites").insert({
        "created_by": user["id"], "kind": cycle["kind"], "links": [link_json(snap, e) for e in cycle["links"]],
    }).execute().data[0]
    sb.table("cycle_invite_members").insert([
        {"invite_id": inv["id"], "profile_id": m, "response": "accepted" if m == user["id"] else "pending"}
        for m in cycle["members"]
    ]).execute()
    return _invite_items(user["id"], inv["id"])[0]


@router.post("/cycle-invites/{invite_id}/respond", response_model=InboxItem, response_model_by_alias=True)
def respond(invite_id: str, body: InviteRespondIn, user: dict = Depends(get_current_user)):
    """When everyone has accepted, each link's helper joins the project it fills."""
    sb = service_client()
    updated = sb.table("cycle_invite_members").update({"response": body.response}) \
        .eq("invite_id", invite_id).eq("profile_id", user["id"]).eq("response", "pending").execute().data
    if not updated:
        exists = sb.table("cycle_invite_members").select("response").eq("invite_id", invite_id).eq("profile_id", user["id"]).execute().data
        raise HTTPException(409 if exists else 404, "You already responded" if exists else "Invite not found")
    members = sb.table("cycle_invite_members").select("response").eq("invite_id", invite_id).execute().data
    responses = [m["response"] for m in members]
    if "declined" in responses:
        sb.table("cycle_invites").update({"status": "declined"}).eq("id", invite_id).eq("status", "pending").execute()
    elif all(r == "accepted" for r in responses):
        done = sb.table("cycle_invites").update({"status": "accepted"}).eq("id", invite_id).eq("status", "pending").execute().data
        if done:
            for link in done[0]["links"]:
                existing = sb.table("project_members").select("role").eq("project_id", link["project_id"]) \
                    .eq("profile_id", link["from"]).execute().data
                if not existing:
                    sb.table("project_members").insert({
                        "project_id": link["project_id"], "profile_id": link["from"], "role": "contributor",
                        "skill_id": link["skill"]["id"], "status": "joined",
                    }).execute()
    return _invite_items(user["id"], invite_id)[0]
