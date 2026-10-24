from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from ..config import settings
from ..db import service_client
from ..deps import get_current_user, get_optional_user
from ..models import ResearchIn, ResearchOut, ResearchPatch, ResearchStart
from ..services import research_service as rs

router = APIRouter()


def _readable(run: dict, user: dict | None) -> dict:
    if not run["is_public"] and (not user or run["requested_by"] != user["id"]):
        raise HTTPException(404, "Report not found")
    return rs.serialize(run)


@router.post("/projects/{project_id}/research", response_model=ResearchStart)
def start(project_id: str, body: ResearchIn, tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Owner of an idea only. Same idea text and checks within 24h returns the cached run.
    RESEARCH_MODE=fixture returns the stored sample (labeled is_sample); live runs TinyFish + the LLM."""
    rows = service_client().table("projects").select("*").eq("id", project_id).execute().data
    if not rows:
        raise HTTPException(404, "Project not found")
    project = rows[0]
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
    rows = service_client().table("research_runs").select("*").eq("id", run_id).execute().data
    if not rows:
        raise HTTPException(404, "Report not found")
    return _readable(rows[0], user)


@router.get("/projects/{project_id}/research/latest", response_model=ResearchOut)
def latest(project_id: str, user: dict | None = Depends(get_optional_user)):
    rows = service_client().table("research_runs").select("*").eq("project_id", project_id) \
        .order("created_at", desc=True).execute().data
    for run in rows:
        if run["is_public"] or (user and run["requested_by"] == user["id"]):
            return rs.serialize(run)
    raise HTTPException(404, "No checks for this project yet")


@router.patch("/research/{run_id}", response_model=ResearchOut)
def patch(run_id: str, body: ResearchPatch, user: dict = Depends(get_current_user)):
    rows = service_client().table("research_runs").update({"is_public": body.is_public}) \
        .eq("id", run_id).eq("requested_by", user["id"]).execute().data
    if not rows:
        raise HTTPException(404, "Report not found")
    return rs.serialize(rows[0])
