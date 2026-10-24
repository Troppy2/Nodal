from fastapi import APIRouter, Depends, HTTPException

from ..db import parallel, service_client
from ..deps import get_current_user
from ..models import LedgerEntry, TolkenOut
from ..services import tolken_service
from ..services.cards import profile_lite
from ..world import world

router = APIRouter()


def _entries(rows: list[dict]) -> list[dict]:
    """LedgerEntry payloads. Titles, skills and people come from the world, with a live lookup for
    anything created since it loaded."""
    w = world()
    need_skill = {n["id"]: n["skill_id"] for n in w.needs}
    missing = [r["need_id"] for r in rows if r["need_id"] not in need_skill]
    if missing:      # a need added since the last load
        need_skill.update({n["id"]: n["skill_id"] for n in service_client().table("project_needs")
                           .select("id,skill_id").in_("id", missing).execute().data})
    titles = {pid: p["title"] for pid, p in w.projects.items()}
    new_projects = list({r["project_id"] for r in rows} - titles.keys())
    if new_projects:
        titles.update({p["id"]: p["title"] for p in service_client().table("projects").select("id,title")
                       .in_("id", new_projects).execute().data})
    people = w.people([r["owner_id"] for r in rows] + [r.get("contributor_id") for r in rows])
    return [{
        "id": r["id"], "project_id": r["project_id"], "project_title": titles.get(r["project_id"], ""),
        "need_id": r["need_id"],
        "skill": w.skills[need_skill[r["need_id"]]]["name"] if r["need_id"] in need_skill else "",
        "owner": profile_lite(people[r["owner_id"]]),
        "contributor": profile_lite(people[r["contributor_id"]]) if r.get("contributor_id") in people else None,
        "amount_tolken": r["amount_tolken"], "status": r["status"], "created_at": r["created_at"],
    } for r in rows if r["owner_id"] in people]


def _owned_entry(entry_id: str, user_id: str) -> dict:
    rows = service_client().table("tolken_ledger").select("*").eq("id", entry_id).execute().data
    if not rows:
        raise HTTPException(404, "Bounty not found")
    if rows[0]["owner_id"] != user_id:
        raise HTTPException(403, "Only the project owner can do that")
    return rows[0]


@router.get("/me/tolken", response_model=TolkenOut)
def my_tolken(user: dict = Depends(get_current_user)):
    """My balance and every bounty I fund or work on, newest first."""
    me = user["id"]
    rows, balance = parallel(
        lambda: service_client().table("tolken_ledger").select("*").or_(f"owner_id.eq.{me},contributor_id.eq.{me}")
        .order("created_at", desc=True).execute().data,
        lambda: tolken_service.balance(me),
    )
    return {"balance": balance, "ledger": _entries(rows)}


@router.post("/projects/{project_id}/needs/{need_id}/fund", response_model=LedgerEntry)
def fund(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    """Moves the bounty from my balance into escrow. Uses the need's pending ledger row
    (created when a request was accepted) or opens one with no contributor yet."""
    t = service_client().table
    project, need, rows = parallel(
        lambda: t("projects").select("owner_id").eq("id", project_id).execute().data,
        lambda: t("project_needs").select("id,bounty_tolken").eq("id", need_id).eq("project_id", project_id).execute().data,
        lambda: t("tolken_ledger").select("*").eq("need_id", need_id).eq("owner_id", user["id"])
        .in_("status", ["pending_funding", "funded"]).order("created_at").execute().data,
    )
    if not project or not need:
        raise HTTPException(404, "Need not found")
    if project[0]["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can fund a bounty")
    if not need[0]["bounty_tolken"]:
        raise HTTPException(409, "This need has no bounty")
    if any(r["status"] == "funded" for r in rows):
        raise HTTPException(409, "This bounty is already funded")
    entry = rows[0] if rows else t("tolken_ledger").insert({
        "project_id": project_id, "need_id": need_id, "owner_id": user["id"], "amount_tolken": need[0]["bounty_tolken"],
    }).execute().data[0]
    return _entries([tolken_service.fund(entry)])[0]


@router.post("/tolken/{entry_id}/release", response_model=LedgerEntry)
def release(entry_id: str, user: dict = Depends(get_current_user)):
    return _entries([tolken_service.release(_owned_entry(entry_id, user["id"]))])[0]


@router.post("/tolken/{entry_id}/cancel", response_model=LedgerEntry)
def cancel(entry_id: str, user: dict = Depends(get_current_user)):
    return _entries([tolken_service.cancel(_owned_entry(entry_id, user["id"]))])[0]
