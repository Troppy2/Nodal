from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import service_client
from ..deps import get_current_user, get_optional_user
from ..models import FeedResponse, ProjectCard, ProjectType, Story
from ..services.cards import load_cards, profile_lite, profiles_by_id
from ..services.graph import cycles_for
from ..services.matching import Snapshot
from ..services.recommend_service import recommend

router = APIRouter()
PAGE = 10


def _ts(created_at: str) -> float:
    return datetime.fromisoformat(created_at.replace("Z", "+00:00")).timestamp()


def _by_recency(snap: Snapshot, ids) -> list[str]:
    return sorted(ids, key=lambda pid: snap.projects[pid]["created_at"], reverse=True)


def _offset(cursor: str | None) -> int:
    try:
        return max(0, int(cursor)) if cursor else 0
    except ValueError:
        raise HTTPException(422, "Bad cursor")


@router.get("/feed", response_model=FeedResponse)
def feed(
    tab: Literal["for_you", "following", "ideas"] = "for_you",
    cursor: str | None = None,
    user: dict | None = Depends(get_optional_user),
):
    """for_you: recommendation order, then everything else by recency (own projects excluded).
    following: projects by people I follow plus ones I starred. ideas: stage idea. Anonymous visitors
    get recency for for_you and an empty following tab."""
    snap = Snapshot.load()
    viewer = user["id"] if user else None
    mine = set(snap.owned.get(viewer, [])) if viewer else set()

    if tab == "ideas":
        ordered = _by_recency(snap, [p for p, v in snap.projects.items() if v["stage"] == "idea"])
    elif tab == "following":
        if not viewer:
            ordered = []
        else:
            sb = service_client()
            followees = {r["followee_id"] for r in sb.table("follows").select("followee_id").eq("follower_id", viewer).execute().data}
            starred = {r["project_id"] for r in sb.table("project_stars").select("project_id").eq("profile_id", viewer).execute().data}
            ids = {p for p, v in snap.projects.items() if v["owner_id"] in followees} | starred
            ordered = _by_recency(snap, ids - mine)
    else:
        ranked = [r["project_id"] for r in recommend(snap, viewer, limit=1000)] if viewer else []
        rest = _by_recency(snap, set(snap.projects) - set(ranked) - mine)
        ordered = ranked + rest

    start = _offset(cursor)
    page = ordered[start:start + PAGE]
    nxt = str(start + PAGE) if start + PAGE < len(ordered) else None
    return {"items": load_cards(page, viewer), "next_cursor": nxt}


@router.get("/feed/stories", response_model=list[Story])
def stories(user: dict = Depends(get_current_user)):
    """People I share a swap or ring with first (with what changes hands), then people I follow."""
    snap = Snapshot.load()
    me = user["id"]
    out: list[dict] = []
    seen: set[str] = set()
    for c in cycles_for(snap, me, limit=20):
        for e in c["links"]:
            partner = e.frm if e.frm != me else None
            if not partner or partner in seen:
                continue
            seen.add(partner)
            gives = snap.skills[e.skill_id]["name"]
            if c["kind"] == "swap":
                back = next(x for x in c["links"] if x.frm == me)
                trade = f"{gives} for {snap.skills[back.skill_id]['name']}"
            else:
                trade = f"{gives} in a 3-way ring"
            out.append({"id": partner, "tag": c["kind"], "trade": trade})
    follows = service_client().table("follows").select("followee_id,created_at").eq("follower_id", me) \
        .order("created_at", desc=True).execute().data
    for f in follows:
        if f["followee_id"] not in seen:
            seen.add(f["followee_id"])
            out.append({"id": f["followee_id"], "tag": None, "trade": None})
    out = out[:10]
    people = profiles_by_id(o["id"] for o in out)
    return [{"profile": profile_lite(people[o["id"]]), "tag": o["tag"], "trade": o["trade"]} for o in out if o["id"] in people]


class Intersection(BaseModel):
    """Not in models.py: the intersections feed is the only user of this shape."""
    project: ProjectCard
    shared_tags: list[str]
    other_type: ProjectType
    other_project_id: str


@router.get("/feed/intersections", response_model=list[Intersection])
def intersections(user: dict | None = Depends(get_optional_user)):
    """Projects that share a tag with a project of a different type, best partner each,
    ordered by shared tag count, then recency."""
    snap = Snapshot.load()
    best: dict[str, tuple[set[str], str]] = {}
    ids = list(snap.projects)
    for a in ids:
        for b in ids:
            if a == b or snap.projects[a]["type"] == snap.projects[b]["type"]:
                continue
            shared = snap.tags.get(a, set()) & snap.tags.get(b, set())
            if shared and (a not in best or len(shared) > len(best[a][0])):
                best[a] = (shared, b)
    order = sorted(best, key=lambda p: (-len(best[p][0]), -_ts(snap.projects[p]["created_at"])))
    cards = {c["id"]: c for c in load_cards(order[:20], user["id"] if user else None)}
    return [{"project": cards[p], "shared_tags": sorted(best[p][0]), "other_type": snap.projects[best[p][1]]["type"],
             "other_project_id": best[p][1]} for p in order[:20] if p in cards]
