"""Request and response models. This file is the API contract the frontend builds against
(it reads /openapi.json). Tolken is the in-app currency; there is no money anywhere in Nodal."""

from typing import Literal

from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

ProjectType = Literal["software", "hardware", "creative"]


def _web_url(value: str | None) -> str | None:
    """Links render as <a href>, so only http(s) is allowed (blocks javascript: and data: URLs)."""
    if value is None or value == "":
        return None
    if not value.lower().startswith(("http://", "https://")) or len(value) > 500:
        raise ValueError("Use a link that starts with http:// or https://")
    return value


WebUrl = Annotated[str | None, AfterValidator(_web_url)]
Stage = Literal["idea", "building", "shipped"]


# ---------- shared pieces ----------

class Cover(BaseModel):
    pattern: Literal["rings", "bars", "blocks", "stripes", "dots"]
    tint: ProjectType


class ProfileLite(BaseModel):
    id: str
    handle: str
    display_name: str | None = None
    avatar_url: str | None = None


class Skill(BaseModel):
    id: int
    name: str
    slug: str
    category: ProjectType


class Offer(BaseModel):
    skill: Skill
    level: int = Field(ge=1, le=3)


class Badges(BaseModel):
    market_verdict: str | None = None
    cool_score: float | None = None


# ---------- projects ----------

class NeedOut(BaseModel):
    id: str
    skill: Skill
    note: str | None = None
    bounty_tolken: int | None = None
    status: Literal["open", "filled"]
    fitters: list[ProfileLite] = []      # people who offer this skill, owner excluded, viewer first
    viewer_fits: bool = False
    viewer_requested: bool = False


class ProjectCard(BaseModel):
    id: str
    title: str
    summary: str
    type: ProjectType
    stage: Stage
    source_access: Literal["none", "open"]
    cover: Cover
    cover_url: str | None = None
    owner: ProfileLite
    tags: list[str]
    needs: list[NeedOut]
    star_count: int
    comment_count: int
    people_fit: int
    badges: Badges
    viewer_starred: bool
    created_at: str


class Member(BaseModel):
    profile: ProfileLite
    role: Literal["owner", "contributor"]
    skill: Skill | None = None
    share_bps: int | None = None
    status: Literal["invited", "joined"]


class ProjectDetail(ProjectCard):
    readme_md: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    has_source: bool
    members: list[Member]
    viewer_follows_owner: bool = False


class ProjectList(BaseModel):
    items: list[ProjectCard]
    next_page: int | None = None


class NeedIn(BaseModel):
    skill_id: int
    note: str | None = None
    bounty_tolken: int | None = Field(default=None, gt=0)


class ProjectIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=600)
    type: ProjectType
    stage: Stage = "idea"
    readme_md: str | None = None
    repo_url: WebUrl = None
    demo_url: WebUrl = None
    tags: list[str] = Field(default=[], max_length=10)
    needs: list[NeedIn] = []


class ProjectPatch(BaseModel):
    title: str | None = None
    summary: str | None = None
    readme_md: str | None = None
    stage: Stage | None = None
    repo_url: WebUrl = None
    demo_url: WebUrl = None
    source_access: Literal["none", "open"] | None = None


# ---------- comments and collab requests ----------

class CommentOut(BaseModel):
    id: str
    author: ProfileLite
    body: str
    created_at: str


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CollabIn(BaseModel):
    skill_id: int
    message: str | None = Field(default=None, max_length=1000)


class CollabOut(BaseModel):
    id: str
    project: ProjectLiteRef
    from_profile: ProfileLite
    skill: Skill
    message: str | None = None
    status: Literal["pending", "accepted", "declined"]
    created_at: str


class ProjectLiteRef(BaseModel):
    id: str
    title: str
    type: ProjectType
    owner: ProfileLite


class RespondIn(BaseModel):
    status: Literal["accepted", "declined"]


# ---------- profiles, me, onboarding ----------

class Stats(BaseModel):
    projects: int
    stars: int
    collaborations: int
    followers: int


class ProfileOut(BaseModel):
    profile: ProfileLite
    bio: str | None = None
    interests: list[str]
    offers: list[Offer]
    stats: Stats
    projects: list[ProjectCard]
    viewer_follows: bool = False
    is_me: bool = False


class MeOut(BaseModel):
    profile: ProfileLite
    bio: str | None = None
    interests: list[str]
    offers: list[Offer]
    tolken_balance: int
    onboarded: bool                    # true once the profile has at least one offer


class MeIn(BaseModel):
    """Onboarding and profile edits. Name is the only sign-in input; the handle derives from it."""
    display_name: str | None = Field(default=None, min_length=1, max_length=60)
    handle: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9-]{1,29}$")
    bio: str | None = Field(default=None, max_length=280)


class OfferIn(BaseModel):
    skill_id: int
    level: int = Field(ge=1, le=3)


class InterestsIn(BaseModel):
    interests: list[str] = Field(max_length=10)


class ActivityDay(BaseModel):
    date: str
    count: int


# ---------- matching and graph ----------

class MatchOut(BaseModel):
    profile: ProfileLite
    skill: Skill
    score: int
    reasons: list[str]
    reciprocal: bool


class ProjectMatchOut(BaseModel):
    project: ProjectCard
    skill: Skill
    score: int
    reasons: list[str]


class CycleLink(BaseModel):
    from_: str = Field(alias="from")
    to: str
    project_id: str
    project_title: str
    skill: Skill

    model_config = {"populate_by_name": True}


class Cycle(BaseModel):
    id: str
    kind: Literal["swap", "ring"]
    score: int
    members: list[ProfileLite]
    links: list[CycleLink]


class GraphNode(BaseModel):
    id: str
    kind: Literal["project", "profile"]
    label: str
    type: ProjectType | None = None
    handle: str | None = None
    depth: int


class GraphEdge(BaseModel):
    source: str
    target: str
    kind: Literal["fills", "owns"]
    skill: str | None = None
    cycle_ids: list[str] = []


class GraphCycle(BaseModel):
    id: str
    kind: Literal["swap", "ring"]
    member_ids: list[str]


class GraphOut(BaseModel):
    root: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    cycles: list[GraphCycle]


# ---------- feed ----------

class FeedResponse(BaseModel):
    items: list[ProjectCard]
    next_cursor: str | None = None


class Story(BaseModel):
    profile: ProfileLite
    tag: Literal["swap", "ring"] | None = None
    trade: str | None = None             # e.g. "ESP32 firmware for UI design"


class Recommendation(BaseModel):
    project: ProjectCard
    score: int
    reasons: list[str]


# ---------- inbox, cycle invites, team ----------

class InboxItem(BaseModel):
    id: str
    kind: Literal["collab", "swap", "ring"]
    direction: Literal["incoming", "outgoing"]
    created_at: str
    people: list[ProfileLite]
    project: ProjectLiteRef | None = None
    skill: Skill | None = None
    message: str | None = None
    links: list[CycleLink] = []
    responses: dict[str, Literal["pending", "accepted", "declined"]] = {}   # profile id -> response
    status: Literal["pending", "accepted", "declined"]
    actions: list[Literal["accept", "decline"]] = []


class CycleInviteIn(BaseModel):
    cycle_id: str                        # an id from GET /me/cycles


class InviteRespondIn(BaseModel):
    response: Literal["accepted", "declined"]


class TeamOut(BaseModel):
    members: list[Member]
    total_bps: int


class ShareIn(BaseModel):
    share_bps: int = Field(ge=0, le=10000)


# ---------- Tolken ----------

class LedgerEntry(BaseModel):
    id: str
    project_id: str
    project_title: str
    need_id: str
    skill: str
    owner: ProfileLite
    contributor: ProfileLite | None = None
    amount_tolken: int
    status: Literal["pending_funding", "funded", "released", "refunded", "cancelled"]
    created_at: str


class TolkenOut(BaseModel):
    balance: int
    ledger: list[LedgerEntry]


# ---------- research and cool factor ----------

class ResearchIn(BaseModel):
    checks: list[Literal["market", "cool"]] = Field(min_length=1)


class ResearchStart(BaseModel):
    id: str
    status: str
    cached: bool


class ResearchOut(BaseModel):
    id: str
    project_id: str
    status: Literal["queued", "running", "done", "partial", "failed"]
    checks: list[Literal["market", "cool"]]
    steps: list[dict]
    report: dict | None = None
    sources: list[dict] | None = None
    cool: dict | None = None
    model: str | None = None
    mode: str
    is_public: bool
    is_sample: bool
    error: str | None = None
    created_at: str


class ResearchPatch(BaseModel):
    is_public: bool


# ---------- source ----------

class SourceFile(BaseModel):
    path: str
    size_bytes: int
    is_text: bool


class SourceTree(BaseModel):
    files: list[SourceFile]


class SourceFileOut(BaseModel):
    path: str
    size_bytes: int
    content: str | None = None
    binary: bool = False


CollabOut.model_rebuild()
