"""Tolken bounties (docs/BACKEND.md "Tolken"). Tolken is the in-app currency; no money moves anywhere.

A bounty's ledger row moves pending_funding -> funded -> released, or ends cancelled (never funded) or
refunded (funded, then called off). Each move is a conditional update (`... where status = <from>`),
so of two concurrent calls only one wins, and balances can't go negative (profiles has a check constraint).
Always read live: this never goes through the world cache.
"""

from datetime import datetime, timezone

from fastapi import HTTPException

from ..db import parallel, service_client

FULL_SHARES = 10000
TRANSITIONS = {
    "pending_funding": {"funded", "cancelled"},
    "funded": {"released", "refunded"},
}


def check_transition(current: str, target: str) -> None:
    if target not in TRANSITIONS.get(current, set()):
        raise HTTPException(409, f"Cannot move a bounty from {current} to {target}")


def _move(entry_id: str, current: str, target: str) -> dict:
    """Claim the transition; 409 if another request moved the row first."""
    check_transition(current, target)
    rows = (service_client().table("tolken_ledger")
            .update({"status": target, "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", entry_id).eq("status", current).execute().data)
    if not rows:
        raise HTTPException(409, "This bounty changed while you were acting on it. Refresh and try again.")
    return rows[0]


def _credit(profile_id: str, amount: int) -> None:
    service_client().rpc("increment_tolken", {"p_profile": profile_id, "p_amount": amount}).execute()


def balance(profile_id: str) -> int:
    rows = service_client().table("profiles").select("tolken_balance").eq("id", profile_id).execute().data
    return rows[0]["tolken_balance"] if rows else 0


def _joined_members(project_id: str) -> list[dict]:
    return (service_client().table("project_members").select("profile_id,share_bps")
            .eq("project_id", project_id).eq("status", "joined").execute().data)


def fund(entry: dict) -> dict:
    """pending_funding -> funded, taking the amount from the owner's balance."""
    check_transition(entry["status"], "funded")
    members, owner_balance = parallel(lambda: _joined_members(entry["project_id"]), lambda: balance(entry["owner_id"]))
    if sum(m["share_bps"] or 0 for m in members) != FULL_SHARES:
        raise HTTPException(409, "Team shares must total 100% before you fund a bounty")
    if owner_balance < entry["amount_tolken"]:
        raise HTTPException(409, "Not enough Tolken to fund this bounty")
    row = _move(entry["id"], "pending_funding", "funded")
    try:
        _credit(entry["owner_id"], -entry["amount_tolken"])
    except Exception:
        # the balance dropped between the check and the debit (check constraint fired): give the claim back
        service_client().table("tolken_ledger").update({"status": "pending_funding"}) \
            .eq("id", entry["id"]).eq("status", "funded").execute()
        raise HTTPException(409, "Not enough Tolken to fund this bounty")
    return row


def release(entry: dict) -> dict:
    """funded -> released. The contributor gets the bounty; with no contributor it is split by joined
    members' shares (each rounded down, remainder to the owner)."""
    check_transition(entry["status"], "released")
    row = _move(entry["id"], "funded", "released")
    amount = entry["amount_tolken"]
    if entry.get("contributor_id"):
        _credit(entry["contributor_id"], amount)
        return row
    paid = 0
    for m in _joined_members(entry["project_id"]):
        cut = amount * (m["share_bps"] or 0) // FULL_SHARES
        if cut and m["profile_id"] != entry["owner_id"]:
            _credit(m["profile_id"], cut)
            paid += cut
    if amount > paid:
        _credit(entry["owner_id"], amount - paid)
    return row


def cancel(entry: dict) -> dict:
    """pending_funding -> cancelled; funded -> refunded (Tolken back to the owner); anything else 409."""
    if entry["status"] == "pending_funding":
        return _move(entry["id"], "pending_funding", "cancelled")
    if entry["status"] == "funded":
        row = _move(entry["id"], "funded", "refunded")
        _credit(entry["owner_id"], entry["amount_tolken"])
        return row
    raise HTTPException(409, f"Cannot cancel a bounty that is {entry['status']}")
