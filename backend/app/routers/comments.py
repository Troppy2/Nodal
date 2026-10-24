from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client, user_client
from ..models import CommentIn, CommentOut
from ..ratelimit import rate_limit
from ..services.cards import profile_lite
from ..world import world
from .projects import known_project

router = APIRouter()
MAX_LEN = 2000


def _out(rows: list[dict]) -> list[dict]:
    people = world().people(r["author_id"] for r in rows)
    return [{"id": r["id"], "author": profile_lite(people[r["author_id"]]), "body": r["body"], "created_at": r["created_at"]}
            for r in rows if r["author_id"] in people]


@router.get("/projects/{project_id}/comments", response_model=list[CommentOut])
def list_comments(project_id: str):
    """Oldest first. Comments are read live so a new one shows straight away."""
    pid = known_project(world(), project_id)
    return _out(service_client().table("comments").select("*").eq("project_id", pid).order("created_at").execute().data)


@router.post("/projects/{project_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(project_id: str, body: CommentIn, user: dict = Depends(rate_limit("10/minute", "comments"))):
    pid = known_project(world(), project_id)
    text = body.body.strip()
    if not text:
        raise HTTPException(422, "Comment is empty")
    row = user_client(user["jwt"]).table("comments").insert(
        {"project_id": pid, "author_id": user["id"], "body": text[:MAX_LEN]}).execute().data[0]
    return _out([row])[0]
