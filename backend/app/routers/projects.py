from fastapi import APIRouter, Depends, HTTPException, Query

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
        service_client().table("project_needs").update(changes).eq("id", need_id).eq("project_id", project_id).execute()
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

@router.post("/projects/{project_id}/needs/{need_id}/submit-work", response_model=ProjectDetail)
def submit_work(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    sb = service_client()
    needs = sb.table("project_needs").select("*").eq("id", need_id).eq("project_id", project_id).execute().data
    if not needs:
        raise HTTPException(404, "Need not found")

    ledger = sb.table("tolken_ledger").select("*").eq("need_id", need_id).in_("status", ["pending_funding", "funded"]).execute().data
    for entry in ledger:
        if not entry.get("contributor_id"):
            sb.table("tolken_ledger").update({"contributor_id": me}).eq("id", entry["id"]).execute()

    w = world()
    skill_name = w.skills.get(needs[0]["skill_id"], {}).get("name", "skill")
    sb.table("comments").insert({
        "project_id": project_id,
        "author_id": me,
        "body": f"Submitted work for {skill_name}! Ready for your review."
    }).execute()

    return fresh_detail(project_id, user["id"])


@router.post("/projects/{project_id}/needs/{need_id}/confirm-work", response_model=ProjectDetail)
def confirm_work(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    sb = service_client()
    needs = sb.table("project_needs").select("*").eq("id", need_id).eq("project_id", project_id).execute().data
    if not needs:
        raise HTTPException(404, "Need not found")

    sb.table("project_needs").update({"status": "filled"}).eq("id", need_id).execute()

    from ..services import tolken_service
    ledger = sb.table("tolken_ledger").select("*").eq("need_id", need_id).in_("status", ["funded", "pending_funding"]).execute().data
    for entry in ledger:
        try:
            if entry["status"] == "pending_funding":
                funded_entry = tolken_service.fund(entry)
                tolken_service.release(funded_entry)
            elif entry["status"] == "funded":
                tolken_service.release(entry)
        except Exception:
            pass

    return fresh_detail(project_id, user["id"])

