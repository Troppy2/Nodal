from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client, user_client
from ..deps import get_current_user
from ..models import CommentIn, CommentOut
from ..services.cards import profile_lite, profiles_by_id
from .projects import get_project_row

router = APIRouter()


def _out(rows: list[dict]) -> list[dict]:
    people = profiles_by_id([r["author_id"] for r in rows])
    return [
        {"id": r["id"], "author": profile_lite(people[r["author_id"]]), "body": r["body"], "created_at": r["created_at"]}
        for r in rows if r["author_id"] in people
    ]


@router.get("/projects/{project_id}/comments", response_model=list[CommentOut])
def list_comments(project_id: str):
    get_project_row(project_id)
    rows = service_client().table("comments").select("*").eq("project_id", project_id).order("created_at").execute().data
    return _out(rows)


@router.post("/projects/{project_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(project_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    get_project_row(project_id)
    text = body.body.strip()
    if not text:
        raise HTTPException(422, "Comment is empty")
    row = user_client(user["jwt"]).table("comments").insert(
        {"project_id": project_id, "author_id": user["id"], "body": text[:2000]}
    ).execute().data[0]
    return _out([row])[0]
