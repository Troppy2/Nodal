from fastapi import APIRouter, Depends, HTTPException

from ..deps import get_current_user
from ..models import MatchOut, ProjectMatchOut
from ..services.cards import load_cards, profile_lite, profiles_by_id, skill_out
from ..services.matching import Snapshot, project_matches, viewer_matches

router = APIRouter()


@router.get("/projects/{project_id}/matches", response_model=list[MatchOut])
def matches_for_project(project_id: str):
    snap = Snapshot.load()
    if project_id not in snap.projects:
        raise HTTPException(404, "Project not found")
    edges = project_matches(snap, project_id)
    people = profiles_by_id(e.frm for e in edges)
    return [{
        "profile": profile_lite(people[e.frm]), "skill": skill_out(snap.skills[e.skill_id]), "score": e.score,
        "reasons": snap.reasons(e), "reciprocal": snap.reciprocal(e.frm, e.to),
    } for e in edges if e.frm in people]


@router.get("/me/matches", response_model=list[ProjectMatchOut])
def my_matches(user: dict = Depends(get_current_user)):
    snap = Snapshot.load()
    edges = viewer_matches(snap, user["id"])
    cards = {c["id"]: c for c in load_cards([e.project_id for e in edges], user["id"])}
    out = []
    for e in edges:
        if e.project_id not in cards:
            continue
        skill = snap.skills[e.skill_id]["name"]
        reasons = [f"Needs {skill}, which you offer", f"Your level {e.level}"]
        if snap.reciprocal(e.frm, e.to):
            reasons.append("Swap: you need something the owner offers")
        out.append({"project": cards[e.project_id], "skill": skill_out(snap.skills[e.skill_id]),
                    "score": e.score, "reasons": reasons})
    return out
