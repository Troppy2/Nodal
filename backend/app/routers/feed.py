from collections import defaultdict
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import get_current_user, get_optional_user
from ..models import FeedResponse, ProjectCard, ProjectType, Story
from ..services.cards import cards, profile_lite
from ..services.recommend_service import recommend
from ..world import world

router = APIRouter()
PAGE = 10
STORIES = 10
INTERSECTIONS = 20


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
    w = world()
    viewer = user["id"] if user else None
    mine = set(w.owned.get(viewer, []))
    if tab == "ideas":
        ordered = w.newest_first(p for p, v in w.projects.items() if v["stage"] == "idea")
    elif tab == "following":
        followees = w.follows.get(viewer, {})
        starred = {p for p, who in w.stars.items() if viewer in who}
        ordered = w.newest_first({p for p, v in w.projects.items() if v["owner_id"] in followees} | starred) if viewer else []
        ordered = [p for p in ordered if p not in mine]
    else:
        ranked = [r["project_id"] for r in recommend(w, viewer, limit=len(w.projects))] if viewer else []
        ordered = ranked + w.newest_first(set(w.projects) - set(ranked) - mine)

    start = _offset(cursor)
    return {"items": cards(w, ordered[start:start + PAGE], viewer),
            "next_cursor": str(start + PAGE) if start + PAGE < len(ordered) else None}


@router.get("/feed/stories", response_model=list[Story])
def stories(user: dict = Depends(get_current_user)):
    """People I share a swap or ring with first (with what changes hands), then people I follow, newest first."""
    w = world()
    me = user["id"]
    out: list[dict] = []
    seen: set[str] = set()
    for c in w.matching.cycles_for(me, limit=20):
        for e in c["links"]:
            if e.frm == me or e.frm in seen:
                continue
            seen.add(e.frm)
            gives = w.skills[e.skill_id]["name"]
            if c["kind"] == "swap":
                back = next(x for x in c["links"] if x.frm == me)
                trade = f"{gives} for {w.skills[back.skill_id]['name']}"
            else:
                trade = f"{gives} in a 3-way ring"
            out.append({"id": e.frm, "tag": c["kind"], "trade": trade})
    out += [{"id": f, "tag": None, "trade": None} for f in w.follows.get(me, {}) if f not in seen]
    return [{"profile": profile_lite(w.profiles[o["id"]]), "tag": o["tag"], "trade": o["trade"]}
            for o in out if o["id"] in w.profiles][:STORIES]


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
    w = world()
    by_tag: dict[str, set[str]] = defaultdict(set)
    for pid, tags in w.tags.items():
        for t in tags:
            by_tag[t].add(pid)
    best: dict[str, tuple[set[str], str]] = {}
    for a in w.projects:
        candidates = {b for t in w.tags.get(a, ()) for b in by_tag[t]}
        for b in sorted(candidates):
            if w.projects.get(b, {}).get("type", w.projects[a]["type"]) == w.projects[a]["type"]:
                continue
            shared = w.tags[a] & w.tags[b]
            if a not in best or len(shared) > len(best[a][0]):
                best[a] = (shared, b)
    order = sorted(w.newest_first(best), key=lambda p: -len(best[p][0]))[:INTERSECTIONS]
    built = {c["id"]: c for c in cards(w, order, user["id"] if user else None)}
    return [{"project": built[p], "shared_tags": sorted(best[p][0]), "other_type": w.projects[best[p][1]]["type"],
             "other_project_id": best[p][1]} for p in order if p in built]
