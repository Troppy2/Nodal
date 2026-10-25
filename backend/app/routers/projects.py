from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError

from ..db import service_client, user_client
from ..deps import get_current_user, get_optional_user
from ..models import NeedIn, NeedPatch, ProjectDetail, ProjectIn, ProjectList, ProjectPatch
from ..services import source_service
from ..services.cards import cards, detail
from ..slugs import is_uuid, unique_slug
from ..world import World, invalidate, world

router = APIRouter()
PAGE = 20
MAX_TAG_LEN = 30
MAX_NOTE_LEN = 300


def project_row(project_id: str) -> dict:
    """The live projects row. Writes check against this rather than the cached world."""
    if not is_uuid(project_id):
        raise HTTPException(404, "Project not found")
    rows = service_client().table("projects").select("*").eq("id", project_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Project not found")
    return rows[0]


def require_owner(project_id: str, user: dict) -> dict:
    p = project_row(project_id)
    if p["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can do that")
    return p


def known_project(w: World, project_id: str) -> str:
    pid = w.project_id(project_id)
    if pid is None:
        raise HTTPException(404, "Project not found")
    return pid


def fresh_detail(project_id: str, viewer_id: str | None) -> dict:
    """Detail after a write: reload the world so the response shows the change."""
    invalidate()
    w = world()
    return detail(w, known_project(w, project_id), viewer_id)


def _need_rows(project_id: str, needs: list[NeedIn], skills: dict) -> list[dict]:
    for n in needs:
        if n.skill_id not in skills:
            raise HTTPException(422, f"Unknown skill {n.skill_id}")
    return [{"project_id": project_id, "skill_id": n.skill_id, "note": (n.note or "").strip()[:MAX_NOTE_LEN] or None,
             "bounty_tolken": n.bounty_tolken} for n in needs]


def _matches_query(w: World, pid: str, needle: str) -> bool:
    p = w.projects[pid]
    hay = [p["title"], p["summary"], w.profiles.get(p["owner_id"], {}).get("handle", ""), *w.tags.get(pid, ())]
    hay += [w.skills[n["skill_id"]]["name"] for n in w.needs_by_project.get(pid, [])]
    return any(needle in h.lower() for h in hay)


@router.get("/projects", response_model=ProjectList)
def list_projects(
    type: str | None = None,
    stage: str | None = None,
    skill: str | None = None,
    tag: str | None = None,
    source: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    viewer: dict | None = Depends(get_optional_user),
):
    """Newest first. `skill` is a skill slug matched against open needs; `q` searches title, summary,
    owner handle, tags and needed skill names."""
    w = world()
    skill_ids = {s["id"] for s in w.skills.values() if s["slug"] == skill}
    needle = (q or "").strip().lower()
    ids = [
        pid for pid in w.newest_first(w.projects)
        if (not type or w.projects[pid]["type"] == type)
        and (not stage or w.projects[pid]["stage"] == stage)
        and (source != "open" or w.projects[pid]["source_access"] == "open")
        and (not tag or tag in w.tags.get(pid, ()))
        and (not skill or any(n["skill_id"] in skill_ids and n["status"] == "open" for n in w.needs_by_project.get(pid, [])))
        and (not needle or _matches_query(w, pid, needle))
    ]
    start = (page - 1) * PAGE
    return {"items": cards(w, ids[start:start + PAGE], viewer and viewer["id"]),
            "next_page": page + 1 if start + PAGE < len(ids) else None}


@router.get("/projects/{project_id}", response_model=ProjectDetail)
def get_project(project_id: str, viewer: dict | None = Depends(get_optional_user)):
    w = world()
    return detail(w, known_project(w, project_id), viewer and viewer["id"])


@router.post("/projects", response_model=ProjectDetail, status_code=201)
def create_project(body: ProjectIn, user: dict = Depends(get_current_user)):
    sb = user_client(user["jwt"])
    skills = world().skills
    _need_rows("", body.needs, skills)                      # validate before writing anything
    pid = sb.table("projects").insert({
        "owner_id": user["id"], "slug": unique_slug(body.title), "type": body.type, "title": body.title.strip(),
        "summary": body.summary.strip(), "readme_md": body.readme_md, "stage": body.stage,
        "repo_url": body.repo_url, "demo_url": body.demo_url, "cover_url": body.cover_url,
    }).execute().data[0]["id"]
    tags = sorted({t.strip().lower()[:MAX_TAG_LEN] for t in body.tags if t.strip()})
    if tags:
        sb.table("project_tags").insert([{"project_id": pid, "tag": t} for t in tags]).execute()
    if body.needs:
        sb.table("project_needs").insert(_need_rows(pid, body.needs, skills)).execute()
    # project_members has no client write policy: FastAPI adds the owner
    service_client().table("project_members").insert({
        "project_id": pid, "profile_id": user["id"], "role": "owner", "share_bps": 10000, "status": "joined",
    }).execute()
    return fresh_detail(pid, user["id"])


@router.patch("/projects/{project_id}", response_model=ProjectDetail)
def patch_project(project_id: str, body: ProjectPatch, user: dict = Depends(get_current_user)):
    project = require_owner(project_id, user)
    changes = body.model_dump(exclude_unset=True)
    tags = changes.pop("tags", None)
    if changes:
        service_client().table("projects").update(changes).eq("id", project_id).execute()
    if tags is not None:
        clean_tags = sorted({t.strip().lower()[:MAX_TAG_LEN] for t in tags if t.strip()})
        service_client().table("project_tags").delete().eq("project_id", project_id).execute()
        if clean_tags:
            service_client().table("project_tags").insert([{"project_id": project_id, "tag": t} for t in clean_tags]).execute()
    # closing source removes what was uploaded, so nothing stays readable through storage or the tree
    if changes.get("source_access", "open") != "open" and project["source_access"] == "open":
        source_service.remove(project_id)
    return fresh_detail(project_id, user["id"])


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    sb = service_client()
    # Refund any funded bounties before deleting
    funded_entries = sb.table("tolken_ledger").select("*").eq("project_id", project_id).eq("status", "funded").execute().data
    for entry in funded_entries:
        try:
            from ..services import tolken_service
            tolken_service.cancel(entry)
        except Exception:
            pass
    try:
        source_service.remove(project_id)
    except Exception:
        pass
    sb.table("projects").delete().eq("id", project_id).execute()
    invalidate()
    return {"ok": True}


@router.post("/projects/{project_id}/needs", response_model=ProjectDetail, status_code=201)
def add_need(project_id: str, body: NeedIn, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    service_client().table("project_needs").insert(_need_rows(project_id, [body], world().skills)).execute()
    return fresh_detail(project_id, user["id"])


@router.patch("/projects/{project_id}/needs/{need_id}", response_model=ProjectDetail)
def patch_need(project_id: str, need_id: str, body: NeedPatch, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    changes = body.model_dump(exclude_unset=True)
    if changes:
        if "note" in changes and changes["note"]:
            changes["note"] = changes["note"].strip()[:MAX_NOTE_LEN] or None
        need = need_row(project_id, need_id)
        if changes.get("status") == "filled" and need["status"] == "open":
            # marking filled credits whoever submitted work; with no submission nobody is credited
            changes.update(completion(need.get("submitted_by")))
        elif changes.get("status") == "open":
            changes.update({"completed_by": None, "completed_at": None, "submitted_by": None})
        update_need(need_id, changes)
    return fresh_detail(project_id, user["id"])


@router.delete("/projects/{project_id}/needs/{need_id}", response_model=ProjectDetail)
def delete_need(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    sb = service_client()
    ledger_entries = sb.table("tolken_ledger").select("*").eq("need_id", need_id).in_("status", ["pending_funding", "funded"]).execute().data
    for entry in ledger_entries:
        try:
            from ..services import tolken_service
            tolken_service.cancel(entry)
        except Exception:
            pass
    sb.table("project_needs").delete().eq("id", need_id).eq("project_id", project_id).execute()
    return fresh_detail(project_id, user["id"])

def need_row(project_id: str, need_id: str) -> dict:
    rows = service_client().table("project_needs").select("*").eq("id", need_id).eq("project_id", project_id).execute().data
    if not rows:
        raise HTTPException(404, "Need not found")
    return rows[0]


COMPLETION_COLS = ("submitted_by", "completed_by", "completed_at")


def update_need(need_id: str, changes: dict, only_open: bool = False) -> None:
    """Update a need. Without the 20261025000000_need_completion migration the completion columns
    don't exist yet, so retry without them instead of failing the request."""
    def run(c: dict) -> None:
        if c:
            q = service_client().table("project_needs").update(c).eq("id", need_id)
            (q.eq("status", "open") if only_open else q).execute()
    try:
        run(changes)
    except APIError as e:
        if e.code not in ("PGRST204", "42703"):
            raise
        run({k: v for k, v in changes.items() if k not in COMPLETION_COLS})


def completion(profile_id: str | None) -> dict:
    """Columns that close a need and credit it to profile_id (nobody when None)."""
    return {"status": "filled", "completed_by": profile_id,
            "completed_at": datetime.now(timezone.utc).isoformat() if profile_id else None}


@router.post("/projects/{project_id}/needs/{need_id}/submit-work", response_model=ProjectDetail)
def submit_work(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    """A joined team member hands in work on an open need; the owner then confirms it."""
    me = user["id"]
    project = project_row(project_id)
    if project["owner_id"] == me:
        raise HTTPException(409, "You own this project. Mark the need filled instead")
    sb = service_client()
    joined = sb.table("project_members").select("profile_id").eq("project_id", project["id"]) \
        .eq("profile_id", me).eq("status", "joined").execute().data
    if not joined:
        raise HTTPException(403, "Join the team before submitting work")
    need = need_row(project["id"], need_id)
    if need["status"] != "open":
        raise HTTPException(409, "This need is already filled")
    if need.get("submitted_by") and need["submitted_by"] != me:
        raise HTTPException(409, "Someone else already submitted work for this need")

    update_need(need_id, {"submitted_by": me})
    sb.table("tolken_ledger").update({"contributor_id": me}).eq("need_id", need_id) \
        .in_("status", ["pending_funding", "funded"]).is_("contributor_id", "null").execute()
    skill_name = world().skills.get(need["skill_id"], {}).get("name", "skill")
    sb.table("comments").insert({"project_id": project["id"], "author_id": me,
                                 "body": f"Submitted work for {skill_name}. Ready for your review."}).execute()
    return fresh_detail(project["id"], me)


@router.post("/projects/{project_id}/needs/{need_id}/confirm-work", response_model=ProjectDetail)
def confirm_work(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    """Owner accepts the work: pays any bounty, closes the need, and credits the contributor.
    Tolken moves first, so a too-low balance or unbalanced shares leaves the need open with a clear error."""
    project = require_owner(project_id, user)
    need = need_row(project["id"], need_id)
    if need["status"] != "open":
        raise HTTPException(409, "This need is already filled")
    sb = service_client()
    ledger = sb.table("tolken_ledger").select("*").eq("need_id", need_id) \
        .in_("status", ["pending_funding", "funded"]).execute().data
    contributor = need.get("submitted_by") or next((e["contributor_id"] for e in ledger if e.get("contributor_id")), None)
    if not contributor:
        raise HTTPException(409, "Nobody has submitted work for this need yet")

    from ..services import tolken_service
    for entry in ledger:
        tolken_service.release(tolken_service.fund(entry) if entry["status"] == "pending_funding" else entry)
    update_need(need_id, completion(contributor))
    return fresh_detail(project["id"], user["id"])
