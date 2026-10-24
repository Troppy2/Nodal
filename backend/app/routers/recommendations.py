from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import service_client
from ..deps import get_current_user
from ..models import Recommendation
from ..services.cards import load_cards
from ..services.matching import Snapshot
from ..services.recommend_service import recommend

router = APIRouter()


@router.get("/me/recommendations", response_model=list[Recommendation])
def my_recommendations(
    stage: Literal["idea", "building", "shipped", "any"] = "any",
    limit: int = Query(20, ge=1, le=50),
    user: dict = Depends(get_current_user),
):
    ranked = recommend(Snapshot.load(), user["id"], stage, limit)
    cards = {c["id"]: c for c in load_cards([r["project_id"] for r in ranked], user["id"])}
    return [{"project": cards[r["project_id"]], "score": r["score"], "reasons": r["reasons"]}
            for r in ranked if r["project_id"] in cards]


@router.post("/me/recommendations/{project_id}/dismiss", status_code=204)
def dismiss(project_id: str, user: dict = Depends(get_current_user)):
    sb = service_client()
    if not sb.table("projects").select("id").eq("id", project_id).execute().data:
        raise HTTPException(404, "Project not found")
    sb.table("recommendation_dismissals").upsert({"profile_id": user["id"], "project_id": project_id}).execute()
