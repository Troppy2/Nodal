"""Market check and cool factor for ideas. Reports are private to whoever ran them until shared."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from ..config import settings
from ..db import service_client
from ..deps import get_current_user, get_optional_user
from ..models import ResearchIn, ResearchOut, ResearchPatch, ResearchStart
from ..services import research_service as rs
from ..slugs import is_uuid
from .projects import project_row

router = APIRouter()


def _visible_to(user: dict | None) -> str:
    """PostgREST filter for runs this viewer may read."""
    return f"is_public.eq.true,requested_by.eq.{user['id']}" if user else "is_public.eq.true"


@router.post("/projects/{project_id}/research", response_model=ResearchStart)
def start(project_id: str, body: ResearchIn, tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Owner of an idea only. Same idea text and checks within 24h returns the cached run.
    RESEARCH_MODE=fixture returns the stored sample (labeled is_sample); live runs TinyFish + the LLM."""
    project = project_row(project_id)
    if project["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can run checks")
    if project["stage"] != "idea":
        raise HTTPException(409, "Checks are for ideas. This project is past the idea stage.")
    checks = sorted(set(body.checks))
    ihash = rs.idea_hash(project)
    cached = rs.cached_run(project_id, ihash, checks)
    if cached:
        return {"id": cached["id"], "status": cached["status"], "cached": True}
    if rs.runs_today(user["id"]) >= settings.research_runs_per_day:
        raise HTTPException(429, f"You can run {settings.research_runs_per_day} checks a day. Try again tomorrow.")
    run = rs.create_run(project_id, user["id"], ihash, checks)
    if settings.research_mode == "fixture":
        tasks.add_task(rs.run_fixture, run["id"], checks)
    else:
        tasks.add_task(rs.run_live, run["id"], project, checks)
    return {"id": run["id"], "status": run["status"], "cached": False}


@router.get("/research/{run_id}", response_model=ResearchOut)
def get_run(run_id: str, user: dict | None = Depends(get_optional_user)):
    if not is_uuid(run_id):
        raise HTTPException(404, "Report not found")
    rows = service_client().table("research_runs").select("*").eq("id", run_id).or_(_visible_to(user)).execute().data
    if not rows:
        raise HTTPException(404, "Report not found")
    return rs.serialize(rows[0])


@router.get("/projects/{project_id}/research/latest", response_model=ResearchOut)
def latest(project_id: str, user: dict | None = Depends(get_optional_user)):
    rows = service_client().table("research_runs").select("*").eq("project_id", project_id).or_(_visible_to(user)) \
        .order("created_at", desc=True).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "No checks for this project yet")
    return rs.serialize(rows[0])


@router.patch("/research/{run_id}", response_model=ResearchOut)
def patch(run_id: str, body: ResearchPatch, user: dict = Depends(get_current_user)):
    rows = service_client().table("research_runs").update({"is_public": body.is_public}) \
        .eq("id", run_id).eq("requested_by", user["id"]).execute().data
    if not rows:
        raise HTTPException(404, "Report not found")
    return rs.serialize(rows[0])
