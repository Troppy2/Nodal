"""The inbox: requests to help (incoming and outgoing) and swap or ring invites, newest first.
When everyone in an invite accepts, each helper joins the project their link fills."""

from fastapi import APIRouter, Depends, HTTPException

from ..db import parallel, service_client
from ..deps import get_current_user
from ..models import CycleInviteIn, CustomSwapIn, InboxItem, InviteRespondIn
from ..services.cards import profile_lite
from ..services.graph import link_json
from ..world import world
from .collab import collab_out, requests_involving

router = APIRouter()
ACTIONS = ["accept", "decline"]


def _collab_items(me: str, rows: list[dict]) -> list[dict]:
    out = []
    for c in collab_out(rows):
        incoming = c["from_profile"]["id"] != me
        out.append({
            "id": c["id"], "kind": "collab", "direction": "incoming" if incoming else "outgoing",
            "created_at": c["created_at"], "people": [c["from_profile"] if incoming else c["project"]["owner"]],
            "project": c["project"], "skill": c["skill"], "message": c["message"], "status": c["status"],
            "actions": ACTIONS if incoming and c["status"] == "pending" else [],
        })
    return out


def _invite_items(me: str, only: str | None = None) -> list[dict]:
    t = service_client().table
    q = t("cycle_invite_members").select("invite_id").eq("profile_id", me)
    ids = [r["invite_id"] for r in (q.eq("invite_id", only) if only else q).execute().data]
    if not ids:
        return []
    invites, members = parallel(
        lambda: t("cycle_invites").select("*").in_("id", ids).execute().data,
        lambda: t("cycle_invite_members").select("*").in_("invite_id", ids).execute().data,
    )
    people = world().people(m["profile_id"] for m in members)
    out = []
    for inv in invites:
        responses = {m["profile_id"]: m["response"] for m in members if m["invite_id"] == inv["id"]}
        out.append({
            "id": inv["id"], "kind": inv["kind"], "direction": "outgoing" if inv["created_by"] == me else "incoming",
            "created_at": inv["created_at"],
            "people": [profile_lite(people[p]) for p in responses if p != me and p in people],
            "links": inv["links"], "responses": responses, "status": inv["status"],
            "actions": ACTIONS if inv["status"] == "pending" and responses.get(me) == "pending" else [],
        })
    return out


@router.get("/me/inbox", response_model=list[InboxItem], response_model_by_alias=True)
def inbox(user: dict = Depends(get_current_user)):
    me = user["id"]
    (incoming, outgoing), invites = parallel(lambda: requests_involving(me), lambda: _invite_items(me))
    collabs = {r["id"]: r for r in incoming + outgoing}
    return sorted(_collab_items(me, list(collabs.values())) + invites, key=lambda i: i["created_at"], reverse=True)


@router.post("/cycles/invite", response_model=InboxItem, response_model_by_alias=True, status_code=201)
def invite(body: CycleInviteIn, user: dict = Depends(get_current_user)):
    """Recomputes my cycles server-side, so only a cycle I am actually in can be invited."""
    w = world()
    cycle = next((c for c in w.matching.cycles_for(user["id"], limit=100) if c["id"] == body.cycle_id), None)
    if not cycle:
        raise HTTPException(404, "That swap or ring isn't open to you any more")
    t = service_client().table
    inv = t("cycle_invites").insert({
        "created_by": user["id"], "kind": cycle["kind"], "links": [link_json(w, e) for e in cycle["links"]],
    }).execute().data[0]
    t("cycle_invite_members").insert([
        {"invite_id": inv["id"], "profile_id": m, "response": "accepted" if m == user["id"] else "pending"}
        for m in cycle["members"]
    ]).execute()
    return _invite_items(user["id"], inv["id"])[0]


@router.post("/cycle-invites/{invite_id}/respond", response_model=InboxItem, response_model_by_alias=True)
def respond(invite_id: str, body: InviteRespondIn, user: dict = Depends(get_current_user)):
    """When everyone has accepted, each link's helper joins the project it fills."""
    t = service_client().table
    updated = t("cycle_invite_members").update({"response": body.response}) \
        .eq("invite_id", invite_id).eq("profile_id", user["id"]).eq("response", "pending").execute().data
    if not updated:
        exists = t("cycle_invite_members").select("response").eq("invite_id", invite_id).eq("profile_id", user["id"]).execute().data
        raise HTTPException(409 if exists else 404, "You already responded" if exists else "Invite not found")
    responses = [m["response"] for m in t("cycle_invite_members").select("response").eq("invite_id", invite_id).execute().data]
    if "declined" in responses:
        t("cycle_invites").update({"status": "declined"}).eq("id", invite_id).eq("status", "pending").execute()
    elif all(r == "accepted" for r in responses):
        # conditional on pending: if two last responses race, only one of them adds the members
        done = t("cycle_invites").update({"status": "accepted"}).eq("id", invite_id).eq("status", "pending").execute().data
        if done:
            links = done[0]["links"]
            joined = parallel(*[
                (lambda link=link: t("project_members").select("role").eq("project_id", link["project_id"])
                 .eq("profile_id", link["from"]).execute().data) for link in links])
            new = [{"project_id": link["project_id"], "profile_id": link["from"], "role": "contributor",
                    "skill_id": link["skill"]["id"], "status": "joined"} for link, rows in zip(links, joined) if not rows]
            if new:
                t("project_members").insert(new).execute()
    return _invite_items(user["id"], invite_id)[0]

@router.post("/cycles/custom-swap", response_model=InboxItem, response_model_by_alias=True, status_code=201)
def custom_swap(body: CustomSwapIn, user: dict = Depends(get_current_user)):
    me = user["id"]
    if body.partner_id == me:
        raise HTTPException(422, "Cannot swap with yourself")
    t = service_client().table
    w = world()

    my_proj = t("projects").select("id,owner_id,title").eq("id", body.my_project_id).execute().data
    their_proj = t("projects").select("id,owner_id,title").eq("id", body.their_project_id).execute().data
    if not my_proj or my_proj[0]["owner_id"] != me:
        raise HTTPException(403, "You do not own your specified project")
    if not their_proj or their_proj[0]["owner_id"] != body.partner_id:
        raise HTTPException(422, "Partner does not own the target project")

    links = [
        {
            "from": me,
            "to": body.partner_id,
            "project_id": body.their_project_id,
            "skill_id": body.my_skill_id,
            "project_title": their_proj[0]["title"],
            "skill_name": w.skills.get(body.my_skill_id, {}).get("name", "Skill"),
        },
        {
            "from": body.partner_id,
            "to": me,
            "project_id": body.my_project_id,
            "skill_id": body.their_skill_id,
            "project_title": my_proj[0]["title"],
            "skill_name": w.skills.get(body.their_skill_id, {}).get("name", "Skill"),
        },
    ]

    inv = t("cycle_invites").insert({
        "created_by": me,
        "kind": "swap",
        "links": links,
    }).execute().data[0]

    t("cycle_invite_members").insert([
        {"invite_id": inv["id"], "profile_id": me, "response": "accepted"},
        {"invite_id": inv["id"], "profile_id": body.partner_id, "response": "pending"},
    ]).execute()

    return _invite_items(me, inv["id"])[0]

