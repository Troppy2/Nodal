"""Stars and follows. Each response carries the new state and count, read live after the write."""

from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client, user_client
from ..deps import get_current_user
from ..world import world
from .projects import known_project

router = APIRouter()


def _star_state(project_id: str, user_id: str) -> dict:
    rows = service_client().table("project_stars").select("profile_id").eq("project_id", project_id).execute().data
    return {"starred": any(r["profile_id"] == user_id for r in rows), "count": len(rows)}


def _follow_state(profile_id: str, user_id: str) -> dict:
    rows = service_client().table("follows").select("follower_id").eq("followee_id", profile_id).execute().data
    return {"following": any(r["follower_id"] == user_id for r in rows), "count": len(rows)}


def _known_profile(profile_id: str) -> None:
    if profile_id not in world().profiles and \
            not service_client().table("profiles").select("id").eq("id", profile_id).execute().data:
        raise HTTPException(404, "Profile not found")


@router.post("/projects/{project_id}/star")
def star(project_id: str, user: dict = Depends(get_current_user)) -> dict:
    pid = known_project(world(), project_id)
    user_client(user["jwt"]).table("project_stars").upsert(
        {"profile_id": user["id"], "project_id": pid}, ignore_duplicates=True).execute()
    return _star_state(pid, user["id"])


@router.delete("/projects/{project_id}/star")
def unstar(project_id: str, user: dict = Depends(get_current_user)) -> dict:
    user_client(user["jwt"]).table("project_stars").delete().eq("profile_id", user["id"]).eq("project_id", project_id).execute()
    return _star_state(project_id, user["id"])


@router.post("/profiles/{profile_id}/follow")
def follow(profile_id: str, user: dict = Depends(get_current_user)) -> dict:
    if profile_id == user["id"]:
        raise HTTPException(422, "You can't follow yourself")
    _known_profile(profile_id)
    user_client(user["jwt"]).table("follows").upsert(
        {"follower_id": user["id"], "followee_id": profile_id}, ignore_duplicates=True).execute()
    return _follow_state(profile_id, user["id"])


@router.delete("/profiles/{profile_id}/follow")
def unfollow(profile_id: str, user: dict = Depends(get_current_user)) -> dict:
    user_client(user["jwt"]).table("follows").delete().eq("follower_id", user["id"]).eq("followee_id", profile_id).execute()
    return _follow_state(profile_id, user["id"])
