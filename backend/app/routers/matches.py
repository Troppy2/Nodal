from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import MatchOut, ProjectMatchOut
from ..services.cards import cards, profile_lite, skill_out
from ..world import world
from .projects import known_project

router = APIRouter()


@router.get("/projects/{project_id}/matches", response_model=list[MatchOut])
def matches_for_project(project_id: str):
    """People who can fill this project's open needs, best first."""
    w = world()
    m = w.matching
    return [{
        "profile": profile_lite(w.profiles[e.frm]), "skill": skill_out(w.skills[e.skill_id]), "score": e.score,
        "reasons": m.reasons(e), "reciprocal": m.reciprocal(e.frm, e.to),
    } for e in m.for_project(known_project(w, project_id)) if e.frm in w.profiles]


@router.get("/me/matches", response_model=list[ProjectMatchOut])
def my_matches(user: dict = Depends(get_current_user)):
    """The mirror view: projects whose open needs I can fill."""
    w = world()
    m = w.matching
    edges = m.for_helper(user["id"])
    built = {c["id"]: c for c in cards(w, [e.project_id for e in edges], user["id"])}
    out = []
    for e in edges:
        if e.project_id not in built:
            continue
        reasons = [f"Needs {w.skills[e.skill_id]['name']}, which you offer", f"Your level {e.level}"]
        if m.reciprocal(e.frm, e.to):
            reasons.append("Swap: you need something the owner offers")
        out.append({"project": built[e.project_id], "skill": skill_out(w.skills[e.skill_id]), "score": e.score,
                    "reasons": reasons})
    return out
