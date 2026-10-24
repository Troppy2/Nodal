"""Market check and cool factor (docs/BACKEND.md "Research agent", "Cool factor check").

Only fixture mode is implemented: the run streams canned steps, then stores the sample report from
fixtures/research_report.json, labeled as a sample. The live TinyFish + LLM pipeline plugs in here later."""

import hashlib
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ..db import service_client

FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "research_report.json"
STEP_DELAY_S = 0.4
MARKET_STEPS = ["Planning searches", "Searching: similar products and demand", "Reading: example.com",
                "Extracting facts", "Writing report"]
COOL_STEPS = ["Looking around: similar projects", "Scoring cool factor"]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def idea_hash(project: dict) -> str:
    text = "\n".join([project.get("title") or "", project.get("summary") or "", project.get("readme_md") or ""])
    return hashlib.sha256(text.encode()).hexdigest()


def cached_run(project_id: str, ihash: str, checks: list[str]) -> dict | None:
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    rows = (
        service_client().table("research_runs").select("*").eq("project_id", project_id).eq("idea_hash", ihash)
        .eq("status", "done").gte("created_at", since).order("created_at", desc=True).execute().data
    )
    return next((r for r in rows if sorted(r["checks"]) == sorted(checks)), None)


def runs_today(profile_id: str) -> int:
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    return service_client().table("research_runs").select("id", count="exact").eq("requested_by", profile_id) \
        .gte("created_at", since).execute().count or 0


def create_run(project_id: str, profile_id: str, ihash: str, checks: list[str]) -> dict:
    return service_client().table("research_runs").insert({
        "project_id": project_id, "requested_by": profile_id, "status": "queued", "mode": "fixture",
        "idea_hash": ihash, "checks": sorted(checks),
    }).execute().data[0]


def run_fixture(run_id: str, checks: list[str]) -> None:
    """Background task: append steps with short delays so the UI shows progress, then store the sample."""
    sb = service_client()
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    labels = (MARKET_STEPS if "market" in checks else []) + (COOL_STEPS if "cool" in checks else [])
    steps: list[dict] = []
    sb.table("research_runs").update({"status": "running"}).eq("id", run_id).execute()
    try:
        for label in labels:
            steps.append({"at": now(), "label": label})
            sb.table("research_runs").update({"steps": steps}).eq("id", run_id).execute()
            time.sleep(STEP_DELAY_S)
        sb.table("research_runs").update({
            "status": "done", "model": "fixture", "finished_at": now(),
            "report": fixture["report"] if "market" in checks else None,
            "sources": fixture["sources"] if "market" in checks else None,
            "cool": fixture["cool"] if "cool" in checks else None,
        }).eq("id", run_id).execute()
    except Exception as exc:  # keep the run readable instead of stuck in "running"
        sb.table("research_runs").update({"status": "failed", "error": str(exc)[:200]}).eq("id", run_id).execute()


def serialize(run: dict) -> dict:
    return {
        "id": run["id"], "project_id": run["project_id"], "status": run["status"], "checks": run["checks"],
        "steps": run.get("steps") or [], "report": run.get("report"), "sources": run.get("sources"),
        "cool": run.get("cool"), "model": run.get("model"), "mode": run["mode"], "is_public": run["is_public"],
        "is_sample": run["mode"] == "fixture", "error": run.get("error"), "created_at": run["created_at"],
    }
