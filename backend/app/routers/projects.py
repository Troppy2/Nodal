from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import service_client, user_client
from ..deps import get_current_user, get_optional_user
from ..models import NeedIn, ProjectDetail, ProjectIn, ProjectList, ProjectPatch
from ..services import source_service
from ..slugs import unique_slug
from ..services.cards import load_cards, profile_lite, profiles_by_id, skill_out, skills_by_id

router = APIRouter()
PAGE = 20


def get_project_row(project_id: str) -> dict:
    rows = service_client().table("projects").select("*").eq("id", project_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Project not found")
    return rows[0]


def require_owner(project_id: str, user: dict) -> dict:
    p = get_project_row(project_id)
    if p["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can do that")
    return p


def project_detail(project_id: str, viewer_id: str | None) -> dict:
    cards = load_cards([project_id], viewer_id, detail=True)
    if not cards:
        raise HTTPException(404, "Project not found")
    card = cards[0]
    sb = service_client()
    members = sb.table("project_members").select("*").eq("project_id", project_id).order("created_at").execute().data
    people = profiles_by_id([m["profile_id"] for m in members])
    skills = skills_by_id()
    # Revenue shares are team-only (GET /projects/{id}/team); everyone else sees who is on the team, not the split.
    is_member = bool(viewer_id) and any(m["profile_id"] == viewer_id for m in members)
    card["members"] = [
        {"profile": profile_lite(people[m["profile_id"]]), "role": m["role"],
         "skill": skill_out(skills[m["skill_id"]]) if m.get("skill_id") else None,
         "share_bps": m.get("share_bps") if is_member else None, "status": m["status"]}
        for m in members if m["profile_id"] in people
    ]
    card["viewer_follows_owner"] = bool(viewer_id) and bool(
        sb.table("follows").select("follower_id").eq("follower_id", viewer_id).eq("followee_id", card["owner"]["id"]).execute().data
    )
    return card


def _insert_needs(sb, project_id: str, needs: list[NeedIn]) -> None:
    if not needs:
        return
    valid = set(skills_by_id())
    for n in needs:
        if n.skill_id not in valid:
            raise HTTPException(422, f"Unknown skill {n.skill_id}")
    sb.table("project_needs").insert([
        {"project_id": project_id, "skill_id": n.skill_id, "note": (n.note or "").strip()[:300] or None,
         "bounty_tolken": n.bounty_tolken}
        for n in needs
    ]).execute()


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
    sb = service_client()
    query = sb.table("projects").select("id,title,summary,owner_id,created_at").order("created_at", desc=True)
    if type:
        query = query.eq("type", type)
    if stage:
        query = query.eq("stage", stage)
    if source == "open":
        query = query.eq("source_access", "open")
    rows = query.execute().data
    ids = [r["id"] for r in rows]

    if tag:
        tagged = {t["project_id"] for t in sb.table("project_tags").select("project_id").eq("tag", tag).execute().data}
        ids = [i for i in ids if i in tagged]
    if skill:
        sk = sb.table("skills").select("id").eq("slug", skill).execute().data
        needing = {n["project_id"] for n in sb.table("project_needs").select("project_id").eq("status", "open")
                   .in_("skill_id", [s["id"] for s in sk] or [-1]).execute().data}
        ids = [i for i in ids if i in needing]
    if q:
        needle = q.strip().lower()
        tags = sb.table("project_tags").select("project_id,tag").execute().data
        owners = profiles_by_id([r["owner_id"] for r in rows])
        need_rows = sb.table("project_needs").select("project_id,skill_id").execute().data
        skills = skills_by_id()
        hay: dict[str, list[str]] = {r["id"]: [r["title"], r["summary"], owners.get(r["owner_id"], {}).get("handle", "")] for r in rows}
        for t in tags:
            hay.get(t["project_id"], []).append(t["tag"])
        for n in need_rows:
            hay.get(n["project_id"], []).append(skills[n["skill_id"]]["name"])
        ids = [i for i in ids if any(needle in h.lower() for h in hay[i])]

    start = (page - 1) * PAGE
    chunk = ids[start:start + PAGE]
    return {"items": load_cards(chunk, viewer and viewer["id"]), "next_page": page + 1 if start + PAGE < len(ids) else None}


@router.get("/projects/{project_id}", response_model=ProjectDetail)
def get_project(project_id: str, viewer: dict | None = Depends(get_optional_user)):
    return project_detail(project_id, viewer and viewer["id"])


@router.post("/projects", response_model=ProjectDetail, status_code=201)
def create_project(body: ProjectIn, user: dict = Depends(get_current_user)):
    sb = user_client(user["jwt"])
    row = sb.table("projects").insert({
        "owner_id": user["id"], "slug": unique_slug(body.title), "type": body.type, "title": body.title.strip(), "summary": body.summary.strip(),
        "readme_md": body.readme_md, "stage": body.stage, "repo_url": body.repo_url, "demo_url": body.demo_url,
    }).execute().data[0]
    pid = row["id"]
    tags = sorted({t.strip().lower()[:30] for t in body.tags if t.strip()})
    if tags:
        sb.table("project_tags").insert([{"project_id": pid, "tag": t} for t in tags]).execute()
    _insert_needs(sb, pid, body.needs)
    # project_members is written by FastAPI only (no client policy)
    service_client().table("project_members").insert({
        "project_id": pid, "profile_id": user["id"], "role": "owner", "share_bps": 10000, "status": "joined",
    }).execute()
    return project_detail(pid, user["id"])


@router.patch("/projects/{project_id}", response_model=ProjectDetail)
def patch_project(project_id: str, body: ProjectPatch, user: dict = Depends(get_current_user)):
    project = require_owner(project_id, user)
    changes = body.model_dump(exclude_unset=True)
    if changes:
        user_client(user["jwt"]).table("projects").update(changes).eq("id", project_id).execute()
    # closing source removes what was uploaded, so nothing stays readable through storage or the tree
    if changes.get("source_access", "open") != "open" and project["source_access"] == "open":
        source_service.remove(project_id)
    return project_detail(project_id, user["id"])


@router.post("/projects/{project_id}/needs", response_model=ProjectDetail, status_code=201)
def add_need(project_id: str, body: NeedIn, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    _insert_needs(user_client(user["jwt"]), project_id, [body])
    return project_detail(project_id, user["id"])
