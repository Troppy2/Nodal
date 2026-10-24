from typing import Literal

from fastapi import APIRouter, Depends, Query

from ..db import service_client
from ..deps import get_current_user
from ..models import Recommendation
from ..services.cards import cards
from ..services.recommend_service import recommend
from ..world import world
from .projects import known_project

router = APIRouter()


@router.get("/me/recommendations", response_model=list[Recommendation])
def my_recommendations(
    stage: Literal["idea", "building", "shipped", "any"] = "any",
    limit: int = Query(20, ge=1, le=50),
    user: dict = Depends(get_current_user),
):
    w = world()
    ranked = recommend(w, user["id"], stage, limit)
    built = {c["id"]: c for c in cards(w, [r["project_id"] for r in ranked], user["id"])}
    return [{"project": built[r["project_id"]], "score": r["score"], "reasons": r["reasons"]}
            for r in ranked if r["project_id"] in built]


@router.post("/me/recommendations/{project_id}/dismiss", status_code=204)
def dismiss(project_id: str, user: dict = Depends(get_current_user)):
    pid = known_project(world(), project_id)
    service_client().table("recommendation_dismissals").upsert({"profile_id": user["id"], "project_id": pid}).execute()
