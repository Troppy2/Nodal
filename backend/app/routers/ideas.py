"""LLM idea suggestions (docs/BACKEND.md "Idea suggestions"). Suggestions are starting points;
nothing here claims they have proven demand."""

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db import service_client
from ..deps import get_current_user
from ..models import IdeaSuggestion, NeedIn, ProjectDetail, ProjectIn
from ..services.cards import skill_out
from ..services.llm import LLMError, llm_json
from ..world import world
from .projects import create_project

router = APIRouter()
PER_DAY = 5


class _Idea(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    pitch: str = Field(min_length=10, max_length=600)
    why_you: str = Field(min_length=3, max_length=300)
    skill_ids: list[int] = Field(default=[], max_length=6)
    tags: list[str] = Field(default=[], max_length=6)


class _Ideas(BaseModel):
    ideas: list[_Idea] = Field(min_length=3, max_length=3)


def _out(row: dict, skills: dict[int, dict]) -> dict:
    return {**{k: row[k] for k in ("id", "title", "pitch", "why_you", "tags", "dismissed", "posted_project_id", "created_at")},
            "skills": [skill_out(skills[s]) for s in row["skill_ids"] if s in skills]}


def _own(suggestion_id: str, user: dict) -> dict:
    rows = service_client().table("idea_suggestions").select("*").eq("id", suggestion_id) \
        .eq("profile_id", user["id"]).execute().data
    if not rows:
        raise HTTPException(404, "Suggestion not found")
    return rows[0]


@router.post("/me/idea-suggestions/generate", response_model=list[IdeaSuggestion], status_code=201)
def generate(user: dict = Depends(get_current_user)):
    sb = service_client()
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    made = sb.table("idea_suggestions").select("id").eq("profile_id", user["id"]).gte("created_at", since).execute().data
    if len(made) >= PER_DAY * 3:
        raise HTTPException(429, f"You can generate ideas {PER_DAY} times a day. Try again tomorrow.")

    w = world()
    skills = w.skills
    mine = w.offers.get(user["id"], {})
    open_needs = Counter(n["skill_id"] for n in w.open_needs).most_common(10)
    trending = Counter(t for tags in w.tags.values() for t in tags).most_common(10)
    taxonomy = "\n".join(f"{s['id']}: {s['name']} ({s['category']})" for s in skills.values())
    my_skills = ", ".join(f"{skills[s]['name']} (level {lvl})" for s, lvl in mine.items() if s in skills)
    prompt = (
        f"My skills: {my_skills or 'none yet'}\n"
        f"My interests: {', '.join(sorted(w.interests.get(user['id'], set()))) or 'none yet'}\n"
        f"Most needed skills on the platform: {', '.join(skills[s]['name'] for s, _ in open_needs)}\n"
        f"Trending tags: {', '.join(t for t, _ in trending)}\n\nSkill taxonomy (id: name):\n{taxonomy}\n\n"
        "Propose exactly 3 small project ideas I could start with people from other disciplines. pitch is 1 to 2 "
        "sentences. why_you is one line on why my skills fit. skill_ids are the skills the idea needs from others, "
        "using ids from the taxonomy only. tags are short lowercase words. Do not claim demand or market size."
    )
    try:
        ideas = llm_json([{"role": "system", "content": "You suggest fun, buildable cross-discipline project ideas."},
                                   {"role": "user", "content": prompt}], _Ideas)
    except LLMError as exc:
        raise HTTPException(503, f"Idea suggestions are unavailable right now ({exc})")
    rows = sb.table("idea_suggestions").insert([
        {"profile_id": user["id"], "title": i.title.strip(), "pitch": i.pitch.strip(), "why_you": i.why_you.strip(),
         "skill_ids": [s for s in dict.fromkeys(i.skill_ids) if s in skills],
         "tags": sorted({t.strip().lower()[:30] for t in i.tags if t.strip()})}
        for i in ideas.ideas
    ]).execute().data
    return [_out(r, skills) for r in rows]


@router.get("/me/idea-suggestions", response_model=list[IdeaSuggestion])
def list_suggestions(user: dict = Depends(get_current_user)):
    rows = service_client().table("idea_suggestions").select("*").eq("profile_id", user["id"]) \
        .eq("dismissed", False).order("created_at", desc=True).limit(30).execute().data
    skills = world().skills
    return [_out(r, skills) for r in rows]


@router.post("/me/idea-suggestions/{suggestion_id}/post", response_model=ProjectDetail, status_code=201)
def post_suggestion(suggestion_id: str, user: dict = Depends(get_current_user)):
    s = _own(suggestion_id, user)
    if s["posted_project_id"]:
        raise HTTPException(409, "This suggestion is already posted")
    skills = world().skills
    cats = Counter(skills[i]["category"] for i in s["skill_ids"] if i in skills)
    readme = f"# {s['title']}\n\n{s['pitch']}\n\n## Why me\n\n{s['why_you']}\n"
    project = create_project(ProjectIn(
        title=s["title"], summary=s["pitch"][:600], type=cats.most_common(1)[0][0] if cats else "software",
        stage="idea", readme_md=readme, tags=s["tags"], needs=[NeedIn(skill_id=i) for i in s["skill_ids"] if i in skills],
    ), user)
    service_client().table("idea_suggestions").update({"posted_project_id": project["id"]}).eq("id", suggestion_id).execute()
    return project


@router.post("/me/idea-suggestions/{suggestion_id}/dismiss", status_code=204)
def dismiss_suggestion(suggestion_id: str, user: dict = Depends(get_current_user)):
    _own(suggestion_id, user)
    service_client().table("idea_suggestions").update({"dismissed": True}).eq("id", suggestion_id).execute()
