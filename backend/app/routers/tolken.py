from fastapi import APIRouter, Depends, HTTPException

from ..db import service_client
from ..deps import get_current_user
from ..models import LedgerEntry, TolkenOut
from ..services import tolken_service
from ..services.cards import profile_lite, profiles_by_id, skills_by_id

router = APIRouter()


def _entries(rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    sb = service_client()
    projects = {p["id"]: p for p in sb.table("projects").select("id,title").in_("id", list({r["project_id"] for r in rows})).execute().data}
    needs = {n["id"]: n for n in sb.table("project_needs").select("id,skill_id").in_("id", list({r["need_id"] for r in rows})).execute().data}
    people = profiles_by_id([r["owner_id"] for r in rows] + [r.get("contributor_id") for r in rows])
    skills = skills_by_id()
    return [{
        "id": r["id"], "project_id": r["project_id"], "project_title": projects.get(r["project_id"], {}).get("title", ""),
        "need_id": r["need_id"], "skill": skills[needs[r["need_id"]]["skill_id"]]["name"] if r["need_id"] in needs else "",
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
    sb = service_client()
    rows = sb.table("tolken_ledger").select("*").or_(f"owner_id.eq.{user['id']},contributor_id.eq.{user['id']}") \
        .order("created_at", desc=True).execute().data
    return {"balance": tolken_service.balance(user["id"]), "ledger": _entries(rows)}


@router.post("/projects/{project_id}/needs/{need_id}/fund", response_model=LedgerEntry)
def fund(project_id: str, need_id: str, user: dict = Depends(get_current_user)):
    """Moves the bounty from my balance into escrow. Uses the need's pending ledger row
    (created when a request was accepted) or opens one with no contributor yet."""
    sb = service_client()
    project = sb.table("projects").select("owner_id").eq("id", project_id).execute().data
    need = sb.table("project_needs").select("id,bounty_tolken").eq("id", need_id).eq("project_id", project_id).execute().data
    if not project or not need:
        raise HTTPException(404, "Need not found")
    if project[0]["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can fund a bounty")
    if not need[0]["bounty_tolken"]:
        raise HTTPException(409, "This need has no bounty")
    rows = sb.table("tolken_ledger").select("*").eq("need_id", need_id).eq("owner_id", user["id"]) \
        .in_("status", ["pending_funding", "funded"]).order("created_at").execute().data
    if any(r["status"] == "funded" for r in rows):
        raise HTTPException(409, "This bounty is already funded")
    entry = rows[0] if rows else sb.table("tolken_ledger").insert({
        "project_id": project_id, "need_id": need_id, "owner_id": user["id"], "amount_tolken": need[0]["bounty_tolken"],
    }).execute().data[0]
    row = tolken_service.fund(entry)
    return _entries([row])[0]


@router.post("/tolken/{entry_id}/release", response_model=LedgerEntry)
def release(entry_id: str, user: dict = Depends(get_current_user)):
    return _entries([tolken_service.release(_owned_entry(entry_id, user["id"]))])[0]


@router.post("/tolken/{entry_id}/cancel", response_model=LedgerEntry)
def cancel(entry_id: str, user: dict = Depends(get_current_user)):
    return _entries([tolken_service.cancel(_owned_entry(entry_id, user["id"]))])[0]
