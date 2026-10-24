from typing import Literal

from pydantic import BaseModel


class Cover(BaseModel):
    pattern: Literal["rings", "bars", "blocks", "stripes", "dots"]
    tint: Literal["software", "hardware", "creative"]


class Profile(BaseModel):
    id: str
    handle: str
    display_name: str | None = None
    avatar_url: str | None = None


class Need(BaseModel):
    skill_id: int
    name: str
    # Tolken is the in-app currency; there is no money in Nodal.
    bounty_tolken: int | None = None


class Badges(BaseModel):
    market_verdict: str | None = None
    cool_score: float | None = None


class Post(BaseModel):
    id: str
    title: str
    summary: str = ""
    stage: Literal["idea", "building", "shipped"]
    type: Literal["software", "hardware", "creative"]
    source_access: Literal["none", "open"] = "none"
    cover_url: str | None = None
    cover: Cover
    owner: Profile
    needs: list[Need]
    star_count: int
    comment_count: int
    people_fit: int
    badges: Badges
    viewer_starred: bool
    created_at: str


class FeedResponse(BaseModel):
    items: list[Post]
    next_cursor: str | None = None


class Story(BaseModel):
    profile: Profile
    tag: Literal["swap", "ring"] | None = None
