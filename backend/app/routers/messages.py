"""Direct messages. A project invite and the follow-up ("have you seen it?") are rows in
the same thread, so the confirmation the owner sees and the DM the invitee receives are
the same object."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from ..db import service_client
from ..deps import get_current_user
from ..limits import limiter
from ..models import ConversationOut, InviteIn, MessageIn, MessageOut, ThreadOut
from ..services.cards import profile_lite, profiles_by_id, skills_by_id
from .projects import get_project_row

router = APIRouter()


def _partner(profile_id: str, me: str) -> dict:
    if profile_id == me:
        raise HTTPException(422, "You can't message yourself")
    people = profiles_by_id([profile_id])
    if profile_id not in people:
        raise HTTPException(404, "That person doesn't exist")
    return profile_lite(people[profile_id])


def _project_ref(rows: list[dict]) -> dict | None:
    ids = [r["project_id"] for r in rows if r.get("project_id")]
    if not ids:
        return None
    project = service_client().table("projects").select("id,title,type,owner_id").eq("id", ids[-1]).execute().data
    if not project:
        return None
    p = project[0]
    owner = profiles_by_id([p["owner_id"]]).get(p["owner_id"])
    if not owner:
        return None
    return {"id": p["id"], "title": p["title"], "type": p["type"], "owner": profile_lite(owner)}


def _out(row: dict, me: str) -> dict:
    return {
        "id": row["id"],
        "body": row["body"],
        "kind": row["kind"],
        "mine": row["from_profile_id"] == me,
        "created_at": row["created_at"],
        "read_at": row.get("read_at"),
    }


def _thread_rows(me: str, other: str) -> list[dict]:
    sb = service_client()
    sent = sb.table("messages").select("*").eq("from_profile_id", me).eq("to_profile_id", other).execute().data
    received = sb.table("messages").select("*").eq("from_profile_id", other).eq("to_profile_id", me).execute().data
    return sorted(sent + received, key=lambda r: r["created_at"])


@router.get("/me/conversations", response_model=list[ConversationOut])
def conversations(user: dict = Depends(get_current_user)):
    me = user["id"]
    sb = service_client()
    rows = sb.table("messages").select("*") \
        .or_(f"from_profile_id.eq.{me},to_profile_id.eq.{me}") \
        .order("created_at", desc=True).execute().data
    unread_rows = sb.table("messages").select("from_profile_id").eq("to_profile_id", me) \
        .is_("read_at", "null").execute().data
    unread: dict[str, int] = {}
    for r in unread_rows:
        unread[r["from_profile_id"]] = unread.get(r["from_profile_id"], 0) + 1

    latest: dict[str, dict] = {}
    for r in rows:
        other = r["to_profile_id"] if r["from_profile_id"] == me else r["from_profile_id"]
        latest.setdefault(other, r)

    people = profiles_by_id(latest.keys())
    out = []
    for other, r in latest.items():
        if other not in people:
            continue
        thread_rows = [x for x in rows if other in (x["from_profile_id"], x["to_profile_id"])]
        out.append({
            "profile": profile_lite(people[other]),
            "project": _project_ref(thread_rows),
            "last_body": r["body"],
            "last_kind": r["kind"],
            "last_at": r["created_at"],
            "mine": r["from_profile_id"] == me,
            "unread": unread.get(other, 0),
        })
    return out


@router.get("/messages/{profile_id}", response_model=ThreadOut)
def thread(profile_id: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    partner = _partner(profile_id, me)
    rows = _thread_rows(me, profile_id)
    if any(r["from_profile_id"] == profile_id and not r.get("read_at") for r in rows):
        service_client().table("messages").update({"read_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("from_profile_id", profile_id).eq("to_profile_id", me).is_("read_at", "null").execute()
    last = rows[-1] if rows else None
    return {
        "profile": partner,
        "project": _project_ref(rows),
        "messages": [_out(r, me) for r in rows],
        "can_nudge": bool(last and last["from_profile_id"] == me and last["kind"] == "invite"),
    }


@router.post("/messages", response_model=MessageOut, status_code=201)
@limiter.limit("30/minute")
def send(request: Request, body: MessageIn, user: dict = Depends(get_current_user)):
    me = user["id"]
    _partner(body.to_profile_id, me)
    text = body.body.strip()
    if not text:
        raise HTTPException(422, "Write a message first")
    if body.project_id:
        get_project_row(body.project_id)
    row = service_client().table("messages").insert({
        "from_profile_id": me,
        "to_profile_id": body.to_profile_id,
        "project_id": body.project_id,
        "kind": "text",
        "body": text[:2000],
    }).execute().data[0]
    return _out(row, me)


@router.post("/messages/{profile_id}/invite", response_model=MessageOut, status_code=201)
@limiter.limit("20/minute")
def invite(request: Request, profile_id: str, body: InviteIn, user: dict = Depends(get_current_user)):
    """An owner invites someone to help on their project. The invite is the DM."""
    me = user["id"]
    partner = _partner(profile_id, me)
    project = get_project_row(body.project_id)
    if project["owner_id"] != me:
        raise HTTPException(403, "Only the project owner can invite people to it")

    rows = _thread_rows(me, profile_id)
    last = rows[-1] if rows else None
    if last and last["from_profile_id"] == me and last["kind"] in ("invite", "nudge"):
        raise HTTPException(409, "You already invited them. Wait for a reply.")

    skill = skills_by_id().get(body.skill_id) if body.skill_id else None
    first = (partner["display_name"] or partner["handle"]).split(" ")[0]
    text = (body.body or "").strip() or (
        f"Hi {first} — I'm building {project['title']} and could use your {skill['name']}."
        if skill else
        f"Hi {first} — I'm building {project['title']} and could use a hand."
    )
    row = service_client().table("messages").insert({
        "from_profile_id": me,
        "to_profile_id": profile_id,
        "project_id": project["id"],
        "kind": "invite",
        "body": text[:2000],
    }).execute().data[0]
    return _out(row, me)


@router.post("/messages/{profile_id}/nudge", response_model=MessageOut, status_code=201)
def nudge(profile_id: str, user: dict = Depends(get_current_user)):
    """One follow-up on an unanswered invite: 'Have you seen it?'"""
    me = user["id"]
    _partner(profile_id, me)
    rows = _thread_rows(me, profile_id)
    last = rows[-1] if rows else None
    if not last or last["from_profile_id"] != me or last["kind"] != "invite":
        raise HTTPException(409, "There's no unanswered invite to follow up on")
    project = None
    if last.get("project_id"):
        found = service_client().table("projects").select("title").eq("id", last["project_id"]).execute().data
        project = found[0]["title"] if found else None
    text = f"Hey — did you see my invite{' for ' + project if project else ''}? No rush, just want to make sure it reached you."
    row = service_client().table("messages").insert({
        "from_profile_id": me,
        "to_profile_id": profile_id,
        "project_id": last.get("project_id"),
        "kind": "nudge",
        "body": text,
    }).execute().data[0]
    return _out(row, me)
