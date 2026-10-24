"""Direct messages. A project invite and the follow-up ("have you seen it?") are rows in
the same thread, so the confirmation the owner sees and the DM the invitee receives are
the same object. Messages are private and always read live; people and projects come from the world."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from ..db import parallel, service_client
from ..deps import get_current_user
from ..limits import limiter
from ..models import ConversationOut, InviteIn, MessageIn, MessageOut, ThreadOut
from ..services.cards import profile_lite, project_ref
from ..world import World, world
from .projects import project_row

router = APIRouter()
MAX_LEN = 2000


def _partner(w: World, profile_id: str, me: str) -> dict:
    if profile_id == me:
        raise HTTPException(422, "You can't message yourself")
    found = w.people([profile_id]).get(profile_id)
    if not found:
        raise HTTPException(404, "That person doesn't exist")
    return profile_lite(found)


def _thread_project(w: World, rows: list[dict]) -> dict | None:
    """The project the conversation is about: the one on its latest message that names one."""
    pid = next((r["project_id"] for r in sorted(rows, key=lambda r: r["created_at"], reverse=True)
                if r.get("project_id") in w.projects), None)
    return project_ref(w, pid) if pid and w.projects[pid]["owner_id"] in w.profiles else None


def _out(row: dict, me: str) -> dict:
    return {"id": row["id"], "body": row["body"], "kind": row["kind"], "mine": row["from_profile_id"] == me,
            "created_at": row["created_at"], "read_at": row.get("read_at")}


def _thread_rows(me: str, other: str) -> list[dict]:
    """Both directions of one conversation, oldest first, in one query."""
    return service_client().table("messages").select("*").or_(
        f"and(from_profile_id.eq.{me},to_profile_id.eq.{other}),and(from_profile_id.eq.{other},to_profile_id.eq.{me})"
    ).order("created_at").execute().data


def _insert(**row) -> dict:
    return service_client().table("messages").insert(row).execute().data[0]


@router.get("/me/conversations", response_model=list[ConversationOut])
def conversations(user: dict = Depends(get_current_user)):
    """One row per person I've messaged with, latest message first."""
    me = user["id"]
    w = world()
    rows = service_client().table("messages").select("*").or_(f"from_profile_id.eq.{me},to_profile_id.eq.{me}") \
        .order("created_at", desc=True).execute().data
    threads: dict[str, list[dict]] = {}
    for r in rows:
        threads.setdefault(r["to_profile_id"] if r["from_profile_id"] == me else r["from_profile_id"], []).append(r)
    people = w.people(threads)
    return [{
        "profile": profile_lite(people[other]), "project": _thread_project(w, thread),
        "last_body": thread[0]["body"], "last_kind": thread[0]["kind"], "last_at": thread[0]["created_at"],
        "mine": thread[0]["from_profile_id"] == me,
        "unread": sum(1 for r in thread if r["to_profile_id"] == me and not r.get("read_at")),
    } for other, thread in threads.items() if other in people]


@router.get("/messages/{profile_id}", response_model=ThreadOut)
def thread(profile_id: str, user: dict = Depends(get_current_user)):
    """The conversation, oldest first. Opening it marks what they sent me as read."""
    me = user["id"]
    w = world()
    partner = _partner(w, profile_id, me)
    rows = _thread_rows(me, profile_id)
    if any(r["from_profile_id"] == profile_id and not r.get("read_at") for r in rows):
        service_client().table("messages").update({"read_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("from_profile_id", profile_id).eq("to_profile_id", me).is_("read_at", "null").execute()
    last = rows[-1] if rows else None
    return {"profile": partner, "project": _thread_project(w, rows), "messages": [_out(r, me) for r in rows],
            "can_nudge": bool(last and last["from_profile_id"] == me and last["kind"] == "invite")}


@router.post("/messages", response_model=MessageOut, status_code=201)
@limiter.limit("30/minute")
def send(request: Request, body: MessageIn, user: dict = Depends(get_current_user)):
    me = user["id"]
    w = world()
    _partner(w, body.to_profile_id, me)
    text = body.body.strip()
    if not text:
        raise HTTPException(422, "Write a message first")
    project_id = None
    if body.project_id:
        project_id = w.project_id(body.project_id) or project_row(body.project_id)["id"]
    return _out(_insert(from_profile_id=me, to_profile_id=body.to_profile_id, project_id=project_id,
                        kind="text", body=text[:MAX_LEN]), me)


@router.post("/messages/{profile_id}/invite", response_model=MessageOut, status_code=201)
@limiter.limit("20/minute")
def invite(request: Request, profile_id: str, body: InviteIn, user: dict = Depends(get_current_user)):
    """An owner invites someone to help on their project. The invite is the DM."""
    me = user["id"]
    w = world()
    partner = _partner(w, profile_id, me)
    project, rows = parallel(lambda: project_row(w.project_id(body.project_id) or body.project_id),
                             lambda: _thread_rows(me, profile_id))
    if project["owner_id"] != me:
        raise HTTPException(403, "Only the project owner can invite people to it")
    last = rows[-1] if rows else None
    if last and last["from_profile_id"] == me and last["kind"] in ("invite", "nudge"):
        raise HTTPException(409, "You already invited them. Wait for a reply.")

    skill = w.skills.get(body.skill_id) if body.skill_id else None
    first = (partner["display_name"] or partner["handle"]).split(" ")[0]
    wanted = f"your {skill['name']}" if skill else "a hand"
    text = (body.body or "").strip() or f"Hi {first} — I'm building {project['title']} and could use {wanted}."
    return _out(_insert(from_profile_id=me, to_profile_id=profile_id, project_id=project["id"],
                        kind="invite", body=text[:MAX_LEN]), me)


@router.post("/messages/{profile_id}/nudge", response_model=MessageOut, status_code=201)
def nudge(profile_id: str, user: dict = Depends(get_current_user)):
    """One follow-up on an unanswered invite: 'Have you seen it?'"""
    me = user["id"]
    w = world()
    _partner(w, profile_id, me)
    rows = _thread_rows(me, profile_id)
    last = rows[-1] if rows else None
    if not last or last["from_profile_id"] != me or last["kind"] != "invite":
        raise HTTPException(409, "There's no unanswered invite to follow up on")
    title = w.projects.get(last.get("project_id"), {}).get("title")
    text = f"Hey — did you see my invite{' for ' + title if title else ''}? No rush, just want to make sure it reached you."
    return _out(_insert(from_profile_id=me, to_profile_id=profile_id, project_id=last.get("project_id"),
                        kind="nudge", body=text), me)
