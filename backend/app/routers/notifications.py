"""Notifications feed: recent activity across stars, comments, follows, bounties, and invites."""

from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..db import parallel, service_client
from ..deps import get_current_user
from ..models import ProfileLite
from ..services.cards import profile_lite
from ..world import world

router = APIRouter()


class NotificationItem(BaseModel):
    id: str
    kind: Literal["star", "comment", "follow", "bounty", "collab", "invite"]
    actor: ProfileLite
    project_id: str | None = None
    project_title: str | None = None
    message: str
    created_at: str
    link: str


@router.get("/me/notifications", response_model=list[NotificationItem])
def my_notifications(user: dict = Depends(get_current_user)):
    me = user["id"]
    w = world()
    t = service_client().table

    # My projects
    my_project_rows = t("projects").select("id,title").eq("owner_id", me).execute().data
    my_project_map = {p["id"]: p["title"] for p in my_project_rows}
    my_pids = list(my_project_map.keys())

    # Parallel queries for notifications
    stars_fut = (
        lambda: t("project_stars")
        .select("project_id,profile_id,created_at")
        .in_("project_id", my_pids)
        .neq("profile_id", me)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        if my_pids
        else []
    )

    comments_fut = (
        lambda: t("comments")
        .select("id,project_id,author_id,body,created_at")
        .in_("project_id", my_pids)
        .neq("author_id", me)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        if my_pids
        else []
    )

    follows_fut = (
        lambda: t("follows")
        .select("follower_id,created_at")
        .eq("followee_id", me)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
    )

    tolken_fut = (
        lambda: t("tolken_ledger")
        .select("*")
        .or_(f"contributor_id.eq.{me},owner_id.eq.{me}")
        .order("updated_at", desc=True)
        .limit(20)
        .execute()
        .data
    )

    stars, comments, follows, tolkens = parallel(stars_fut, comments_fut, follows_fut, tolken_fut)

    # Collect all actor IDs to look up profiles
    actor_ids = set()
    for s in stars:
        actor_ids.add(s["profile_id"])
    for c in comments:
        actor_ids.add(c["author_id"])
    for f in follows:
        actor_ids.add(f["follower_id"])
    for tk in tolkens:
        other = tk["owner_id"] if tk.get("contributor_id") == me else tk.get("contributor_id")
        if other:
            actor_ids.add(other)

    people = w.people(actor_ids)
    missing_ids = [aid for aid in actor_ids if aid not in people]
    if missing_ids:
        fresh = t("profiles").select("id,handle,display_name,avatar_url").in_("id", missing_ids).execute().data
        for fp in fresh:
            people[fp["id"]] = fp

    notifications: list[NotificationItem] = []

    for s in stars:
        actor = people.get(s["profile_id"])
        if not actor:
            continue
        pid = s["project_id"]
        title = my_project_map.get(pid, "your project")
        notifications.append(
            NotificationItem(
                id=f"star:{pid}:{s['profile_id']}",
                kind="star",
                actor=profile_lite(actor),
                project_id=pid,
                project_title=title,
                message=f"starred {title}",
                created_at=s["created_at"],
                link=f"/projects/{pid}",
            )
        )

    for c in comments:
        actor = people.get(c["author_id"])
        if not actor:
            continue
        pid = c["project_id"]
        title = my_project_map.get(pid, "your project")
        snippet = (c["body"][:60] + "...") if len(c["body"]) > 60 else c["body"]
        notifications.append(
            NotificationItem(
                id=f"comment:{c['id']}",
                kind="comment",
                actor=profile_lite(actor),
                project_id=pid,
                project_title=title,
                message=f'commented on {title}: "{snippet}"',
                created_at=c["created_at"],
                link=f"/projects/{pid}?tab=discussion",
            )
        )

    for f in follows:
        actor = people.get(f["follower_id"])
        if not actor:
            continue
        notifications.append(
            NotificationItem(
                id=f"follow:{f['follower_id']}",
                kind="follow",
                actor=profile_lite(actor),
                message="started following you",
                created_at=f["created_at"],
                link=f"/u/{actor['handle']}",
            )
        )

    for tk in tolkens:
        status = tk.get("status")
        amount = tk.get("amount_tolken", 0)
        pid = tk.get("project_id")
        p_title = my_project_map.get(pid) or (w.projects.get(pid, {}).get("title") if pid else "project")

        if tk.get("contributor_id") == me:
            actor_id = tk["owner_id"]
            actor = people.get(actor_id)
            if not actor:
                continue
            if status == "released":
                notifications.append(
                    NotificationItem(
                        id=f"tolken:released:{tk['id']}",
                        kind="bounty",
                        actor=profile_lite(actor),
                        project_id=pid,
                        project_title=p_title,
                        message=f"released {amount} Tolken bounty to you for {p_title}!",
                        created_at=tk["updated_at"] or tk["created_at"],
                        link=f"/projects/{pid}",
                    )
                )
            elif status == "funded":
                notifications.append(
                    NotificationItem(
                        id=f"tolken:funded:{tk['id']}",
                        kind="bounty",
                        actor=profile_lite(actor),
                        project_id=pid,
                        project_title=p_title,
                        message=f"funded a {amount} Tolken bounty on {p_title}",
                        created_at=tk["updated_at"] or tk["created_at"],
                        link=f"/projects/{pid}",
                    )
                )

    notifications.sort(key=lambda n: n.created_at, reverse=True)
    return notifications[:30]
