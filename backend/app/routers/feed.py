from typing import Literal

from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import FeedResponse, Post, Story

router = APIRouter()

_MAYA = {"id": "u-maya", "handle": "maya", "display_name": "Maya"}
_DEV = {"id": "u-dev", "handle": "dev", "display_name": "Dev"}

_POSTS = [
    {
        "id": "p-soil-choir", "title": "Soil Choir", "summary": "Sonify soil sensors.",
        "stage": "idea", "type": "creative", "cover": {"pattern": "rings", "tint": "creative"},
        "owner": _MAYA, "needs": [{"skill_id": 1, "name": "ESP32 firmware"}],
        "star_count": 12, "comment_count": 3, "people_fit": 4,
        "badges": {"market_verdict": "mixed", "cool_score": 8.0},
        "viewer_starred": False, "created_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "p-plant-monitor", "title": "Plant monitor", "summary": "ESP32 plant sensor.",
        "stage": "building", "type": "hardware", "source_access": "open",
        "cover": {"pattern": "bars", "tint": "hardware"},
        "owner": _DEV, "needs": [{"skill_id": 1, "name": "ESP32 firmware", "bounty_tolken": 50}],
        "star_count": 30, "comment_count": 5, "people_fit": 2,
        "badges": {}, "viewer_starred": True, "created_at": "2026-01-02T00:00:00Z",
    },
]


@router.get("/feed", response_model=FeedResponse)
def feed(
    tab: Literal["for_you", "following", "ideas"] = "for_you",
    cursor: str | None = None,
    user: dict = Depends(get_current_user),
):
    items = [p for p in _POSTS if tab != "ideas" or p["stage"] == "idea"]
    return {"items": items, "next_cursor": None}


@router.get("/feed/stories", response_model=list[Story])
def stories(user: dict = Depends(get_current_user)):
    return [{"profile": _MAYA, "tag": "swap"}, {"profile": _DEV, "tag": "ring"}]
