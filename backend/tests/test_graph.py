"""Group B: graph, cycles, stories, inbox invites, team, Tolken, research. Runs against local Supabase + seed."""

from functools import lru_cache

import pytest

from app.config import settings
from app.db import service_client
from app.services import research_service

from .conftest import session_headers

P = "/api/v1"


@lru_cache
def headers_for(profile_id: str) -> dict:
    """A real session for a seeded person, cached so the run stays under Supabase's verify rate limit."""
    return session_headers(profile_id)


def skill_id(name: str) -> int:
    return service_client().table("skills").select("id").eq("name", name).execute().data[0]["id"]


@pytest.fixture
def swap_user(new_user, seeded):
    """A new user who offers Python backend and owns an idea that needs UI design: a swap with Sam
    (Sam's Park&Go needs Python backend; Sam offers UI design)."""
    sb = service_client()
    u = new_user()
    sb.table("profile_offers").insert({"profile_id": u["id"], "skill_id": skill_id("Python backend"), "level": 3}).execute()
    proj = sb.table("projects").insert({
        "owner_id": u["id"], "slug": f"test-idea-{u['id'][:8]}", "type": "software", "title": "Test Idea", "summary": "A test idea", "stage": "idea",
    }).execute().data[0]
    sb.table("project_needs").insert({"project_id": proj["id"], "skill_id": skill_id("UI design"), "note": "screens",
                                      "bounty_tolken": 30}).execute()
    sb.table("project_members").insert({"project_id": proj["id"], "profile_id": u["id"], "role": "owner",
                                        "share_bps": 10000, "status": "joined"}).execute()
    u["project_id"] = proj["id"]
    yield u
    # these FKs to profiles have no cascade in the spec schema; clear them so the user can be deleted
    sb.table("cycle_invites").delete().eq("created_by", u["id"]).execute()
    sb.table("tolken_ledger").delete().eq("owner_id", u["id"]).execute()
    sb.table("research_runs").delete().eq("requested_by", u["id"]).execute()


def test_seeded_ring_lights_up_in_plant_monitor_graph(client, seeded):
    g = client.get(f"{P}/graph/projects/{seeded('project', 'plant-monitor')}").json()
    ring = {seeded("profile", h) for h in ("maya", "rin", "dev")}
    rings = [c for c in g["cycles"] if c["kind"] == "ring" and set(c["member_ids"]) == ring]
    assert rings, "seeded maya-rin-dev ring missing"
    marked = [e for e in g["edges"] if rings[0]["id"] in e["cycle_ids"] and e["kind"] == "fills"]
    assert len(marked) == 3
    assert len(g["nodes"]) <= 40
    assert client.get(f"{P}/graph/projects/{seeded('project', 'plant-monitor')}?depth=3").status_code == 422


def test_project_matches_flag_reciprocal(client, seeded):
    rows = client.get(f"{P}/projects/{seeded('project', 'park-and-go')}/matches").json()
    leila = next(r for r in rows if r["profile"]["handle"] == "leila")
    assert leila["reciprocal"] and leila["reasons"]
    assert rows == sorted(rows, key=lambda r: -r["score"])


def test_swap_shows_in_cycles_stories_and_invite_flow(client, swap_user, seeded):
    sam = seeded("profile", "sam")
    cycles = client.get(f"{P}/me/cycles", headers=swap_user["headers"]).json()
    swap = next(c for c in cycles if c["kind"] == "swap" and {m["id"] for m in c["members"]} == {swap_user["id"], sam})
    assert {link["from"] for link in swap["links"]} == {swap_user["id"], sam}

    stories = client.get(f"{P}/feed/stories", headers=swap_user["headers"]).json()
    # Order is score-driven, and the generated profiles add other swaps; Sam only has to be present
    # as a swap with a trade, not first.
    story = next((s for s in stories if s["profile"]["id"] == sam), None)
    assert story and story["tag"] == "swap" and story["trade"]

    inv = client.post(f"{P}/cycles/invite", json={"cycle_id": swap["id"]}, headers=swap_user["headers"])
    assert inv.status_code == 201, inv.text
    invite = inv.json()
    assert invite["responses"][swap_user["id"]] == "accepted" and invite["responses"][sam] == "pending"
    assert client.post(f"{P}/cycles/invite", json={"cycle_id": "nope"}, headers=swap_user["headers"]).status_code == 404

    inbox = client.get(f"{P}/me/inbox", headers=headers_for(sam)).json()
    item = next(i for i in inbox if i["id"] == invite["id"])
    assert item["actions"] == ["accept", "decline"]

    done = client.post(f"{P}/cycle-invites/{invite['id']}/respond", json={"response": "accepted"}, headers=headers_for(sam))
    assert done.status_code == 200 and done.json()["status"] == "accepted"
    assert client.post(f"{P}/cycle-invites/{invite['id']}/respond", json={"response": "accepted"},
                       headers=headers_for(sam)).status_code == 409
    joined = service_client().table("project_members").select("profile_id,status").eq("project_id", swap_user["project_id"]).execute().data
    assert {"profile_id": sam, "status": "joined"} in joined
    # clean up Sam's membership on the seeded project
    service_client().table("project_members").delete().eq("project_id", seeded("project", "park-and-go")) \
        .eq("profile_id", swap_user["id"]).execute()


def test_team_shares_reject_over_100(client, swap_user, seeded):
    sam = seeded("profile", "sam")
    service_client().table("project_members").insert({"project_id": swap_user["project_id"], "profile_id": sam,
                                                      "role": "contributor", "share_bps": 0, "status": "joined"}).execute()
    url = f"{P}/projects/{swap_user['project_id']}/team"
    assert client.get(url, headers=swap_user["headers"]).json()["total_bps"] == 10000
    assert client.patch(f"{url}/{sam}", json={"share_bps": 1}, headers=swap_user["headers"]).status_code == 422
    ok = client.patch(f"{url}/{swap_user['id']}", json={"share_bps": 6000}, headers=swap_user["headers"])
    assert ok.status_code == 200 and ok.json()["total_bps"] == 6000
    assert client.patch(f"{url}/{sam}", json={"share_bps": 4000}, headers=headers_for(sam)).status_code == 403
    assert client.get(url, headers=headers_for(seeded("profile", "maya"))).status_code == 403


def test_tolken_fund_release_credits_once(client, swap_user, seeded):
    sb = service_client()
    sam = seeded("profile", "sam")
    need = sb.table("project_needs").select("id").eq("project_id", swap_user["project_id"]).execute().data[0]["id"]
    sb.table("tolken_ledger").insert({"project_id": swap_user["project_id"], "need_id": need, "owner_id": swap_user["id"],
                                      "contributor_id": sam, "amount_tolken": 30}).execute()
    sam_before = sb.table("profiles").select("tolken_balance").eq("id", sam).execute().data[0]["tolken_balance"]
    h = swap_user["headers"]

    funded = client.post(f"{P}/projects/{swap_user['project_id']}/needs/{need}/fund", headers=h)
    assert funded.status_code == 200, funded.text
    assert funded.json()["status"] == "funded"
    assert client.get(f"{P}/me/tolken", headers=h).json()["balance"] == 70
    assert client.post(f"{P}/projects/{swap_user['project_id']}/needs/{need}/fund", headers=h).status_code == 409

    entry = funded.json()["id"]
    assert client.post(f"{P}/tolken/{entry}/release", headers=headers_for(sam)).status_code == 403
    assert client.post(f"{P}/tolken/{entry}/release", headers=h).json()["status"] == "released"
    assert client.post(f"{P}/tolken/{entry}/release", headers=h).status_code == 409
    assert client.post(f"{P}/tolken/{entry}/cancel", headers=h).status_code == 409
    sam_after = sb.table("profiles").select("tolken_balance").eq("id", sam).execute().data[0]["tolken_balance"]
    assert sam_after == sam_before + 30
    sb.rpc("increment_tolken", {"p_profile": sam, "p_amount": -30}).execute()


def test_tolken_fund_rejects_low_balance(client, swap_user):
    sb = service_client()
    sb.table("project_needs").update({"bounty_tolken": 500}).eq("project_id", swap_user["project_id"]).execute()
    need = sb.table("project_needs").select("id").eq("project_id", swap_user["project_id"]).execute().data[0]["id"]
    r = client.post(f"{P}/projects/{swap_user['project_id']}/needs/{need}/fund", headers=swap_user["headers"])
    assert r.status_code == 409 and "Tolken" in r.json()["detail"]


def test_research_fixture_run_caches_and_limits(client, swap_user, monkeypatch):
    # Pin fixture mode: this test asserts the stored sample is returned, so it must not depend on
    # RESEARCH_MODE in the developer's .env (live mode would hit TinyFish + the LLM).
    monkeypatch.setattr(settings, "research_mode", "fixture")
    monkeypatch.setattr(research_service, "STEP_DELAY_S", 0)
    h, pid = swap_user["headers"], swap_user["project_id"]
    start = client.post(f"{P}/projects/{pid}/research", json={"checks": ["market", "cool"]}, headers=h)
    assert start.status_code == 200 and start.json()["cached"] is False
    run = client.get(f"{P}/research/{start.json()['id']}", headers=h).json()
    assert run["status"] == "done" and run["is_sample"] and run["report"]["verdict"] and run["cool"]["overall"]
    assert len(run["steps"]) == 7

    again = client.post(f"{P}/projects/{pid}/research", json={"checks": ["cool", "market"]}, headers=h).json()
    assert again["cached"] is True and again["id"] == start.json()["id"]
    assert client.get(f"{P}/research/{start.json()['id']}").status_code == 404          # private until shared
    client.patch(f"{P}/research/{start.json()['id']}", json={"is_public": True}, headers=h)
    assert client.get(f"{P}/projects/{pid}/research/latest").json()["id"] == start.json()["id"]

    assert client.post(f"{P}/projects/{pid}/research", json={"checks": []}, headers=h).status_code == 422
    client.post(f"{P}/projects/{pid}/research", json={"checks": ["market"]}, headers=h)
    client.post(f"{P}/projects/{pid}/research", json={"checks": ["cool"]}, headers=h)
    service_client().table("projects").update({"summary": "changed"}).eq("id", pid).execute()
    assert client.post(f"{P}/projects/{pid}/research", json={"checks": ["market"]}, headers=h).status_code == 429

    service_client().table("projects").update({"stage": "building"}).eq("id", pid).execute()
    assert client.post(f"{P}/projects/{pid}/research", json={"checks": ["market"]}, headers=h).status_code == 409


def test_feed_for_you_excludes_own_and_recommendations_rank_fit_first(client, swap_user):
    h = swap_user["headers"]
    items = client.get(f"{P}/feed?tab=for_you", headers=h).json()["items"]
    assert swap_user["project_id"] not in {i["id"] for i in items}
    recs = client.get(f"{P}/me/recommendations", headers=h).json()
    assert recs and recs[0]["reasons"][0].startswith("Needs Python backend")
    first = recs[0]["project"]["id"]
    assert client.post(f"{P}/me/recommendations/{first}/dismiss", headers=h).status_code == 204
    assert first not in {r["project"]["id"] for r in client.get(f"{P}/me/recommendations", headers=h).json()}
    matches = client.get(f"{P}/me/matches", headers=h).json()
    assert matches and all(m["skill"]["name"] == "Python backend" for m in matches)
