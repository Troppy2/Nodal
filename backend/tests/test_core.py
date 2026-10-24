"""Group A endpoints against local Supabase: projects, comments, collab requests, stars, follows,
profiles, me/onboarding, source. Uses real anonymous users from conftest."""

import io
import zipfile

from app.db import service_client

P = "/api/v1"


def skill_id(client, name):
    return next(s["id"] for s in client.get(f"{P}/skills").json() if s["name"] == name)


def make_project(client, user, **extra):
    body = {"title": "Test lamp", "summary": "A lamp for tests.", "type": "hardware", "stage": "building",
            "tags": ["Test-Tag"], "needs": [], **extra}
    r = client.post(f"{P}/projects", json=body, headers=user["headers"])
    assert r.status_code == 201, r.text
    return r.json()


def test_skills_and_project_list(client):
    skills = client.get(f"{P}/skills").json()
    assert len(skills) >= 50 and {"id", "name", "slug", "category"} <= set(skills[0])
    page = client.get(f"{P}/projects").json()
    assert page["items"] and "next_page" in page
    ideas = client.get(f"{P}/projects?stage=idea").json()["items"]
    assert ideas and all(p["stage"] == "idea" for p in ideas)
    hits = client.get(f"{P}/projects?q=esp32").json()["items"]
    assert any(p["title"] == "Plant monitor" for p in hits)
    assert all(p["source_access"] == "open" for p in client.get(f"{P}/projects?source=open").json()["items"])


def test_create_project_and_detail(client, new_user):
    a = new_user()
    sid = skill_id(client, "Sound design")
    p = make_project(client, a, needs=[{"skill_id": sid, "note": "loops", "bounty_tolken": 20}])
    assert p["tags"] == ["test-tag"]
    assert p["members"][0]["role"] == "owner" and p["members"][0]["share_bps"] == 10000
    need = p["needs"][0]
    assert need["skill"]["name"] == "Sound design" and need["bounty_tolken"] == 20
    assert any(f["handle"] == "rin" for f in need["fitters"])
    detail = client.get(f"{P}/projects/{p['id']}").json()
    assert detail["title"] == "Test lamp" and detail["has_source"] is False
    assert client.get(f"{P}/projects/00000000-0000-0000-0000-000000000000").status_code == 404


def test_rls_other_user_cannot_patch(client, new_user):
    a, b = new_user(), new_user()
    p = make_project(client, a)
    r = client.patch(f"{P}/projects/{p['id']}", json={"title": "hijacked"}, headers=b["headers"])
    assert r.status_code == 403
    # direct RLS check: B's own token cannot update A's row through PostgREST either
    from app.db import user_client
    user_client(b["token"]).table("projects").update({"title": "hijacked"}).eq("id", p["id"]).execute()
    assert client.get(f"{P}/projects/{p['id']}").json()["title"] == "Test lamp"
    ok = client.patch(f"{P}/projects/{p['id']}", json={"stage": "shipped"}, headers=a["headers"])
    assert ok.status_code == 200 and ok.json()["stage"] == "shipped"


def test_star_toggle(client, new_user, seeded):
    u = new_user()
    pid = seeded("project", "plant-monitor")
    before = client.get(f"{P}/projects/{pid}").json()["star_count"]
    on = client.post(f"{P}/projects/{pid}/star", headers=u["headers"]).json()
    assert on == {"starred": True, "count": before + 1}
    assert client.post(f"{P}/projects/{pid}/star", headers=u["headers"]).json()["count"] == before + 1
    assert client.get(f"{P}/projects/{pid}", headers=u["headers"]).json()["viewer_starred"] is True
    off = client.delete(f"{P}/projects/{pid}/star", headers=u["headers"]).json()
    assert off == {"starred": False, "count": before}


def test_follow(client, new_user, seeded):
    u = new_user()
    maya = seeded("profile", "maya")
    r = client.post(f"{P}/profiles/{maya}/follow", headers=u["headers"]).json()
    assert r["following"] is True
    assert client.get(f"{P}/profiles/maya", headers=u["headers"]).json()["viewer_follows"] is True
    assert client.delete(f"{P}/profiles/{maya}/follow", headers=u["headers"]).json()["following"] is False
    assert client.post(f"{P}/profiles/{u['id']}/follow", headers=u["headers"]).status_code == 422


def test_comment(client, new_user, seeded):
    u = new_user()
    pid = seeded("project", "soil-choir")
    assert client.post(f"{P}/projects/{pid}/comments", json={"body": "hi"}).status_code == 401
    r = client.post(f"{P}/projects/{pid}/comments", json={"body": "  Count me in  "}, headers=u["headers"])
    assert r.status_code == 201 and r.json()["body"] == "Count me in"
    assert any(c["id"] == r.json()["id"] for c in client.get(f"{P}/projects/{pid}/comments").json())


def test_collab_accept_creates_ledger(client, new_user):
    a, b = new_user(), new_user()
    sid = skill_id(client, "Sound design")
    other = skill_id(client, "Woodworking")
    p = make_project(client, a, needs=[{"skill_id": sid, "note": "loops", "bounty_tolken": 30}])
    url = f"{P}/projects/{p['id']}/collab-requests"
    assert client.post(url, json={"skill_id": sid}, headers=a["headers"]).status_code == 409
    assert client.post(url, json={"skill_id": other}, headers=b["headers"]).status_code == 422
    req = client.post(url, json={"skill_id": sid, "message": "I can do it"}, headers=b["headers"])
    assert req.status_code == 201, req.text
    assert client.post(url, json={"skill_id": sid}, headers=b["headers"]).status_code == 409
    rid = req.json()["id"]

    assert client.get(f"{P}/projects/{p['id']}", headers=b["headers"]).json()["needs"][0]["viewer_requested"] is True
    assert any(r["id"] == rid for r in client.get(f"{P}/me/collab-requests", headers=a["headers"]).json()["incoming"])
    assert any(r["id"] == rid for r in client.get(f"{P}/me/collab-requests", headers=b["headers"]).json()["outgoing"])

    assert client.post(f"{P}/collab-requests/{rid}/respond", json={"status": "accepted"}, headers=b["headers"]).status_code == 403
    ok = client.post(f"{P}/collab-requests/{rid}/respond", json={"status": "accepted"}, headers=a["headers"])
    assert ok.status_code == 200 and ok.json()["status"] == "accepted"
    assert client.post(f"{P}/collab-requests/{rid}/respond", json={"status": "declined"}, headers=a["headers"]).status_code == 409

    sb = service_client()
    ledger = sb.table("tolken_ledger").select("*").eq("project_id", p["id"]).execute().data
    assert len(ledger) == 1 and ledger[0]["amount_tolken"] == 30 and ledger[0]["status"] == "pending_funding"
    assert ledger[0]["contributor_id"] == b["id"]
    members = client.get(f"{P}/projects/{p['id']}").json()["members"]
    assert any(m["profile"]["id"] == b["id"] and m["role"] == "contributor" for m in members)
    sb.table("tolken_ledger").delete().eq("project_id", p["id"]).execute()  # lets the fixture delete both users


def test_onboarding(client, new_user):
    u = new_user()
    me = client.get(f"{P}/me", headers=u["headers"]).json()
    assert me["onboarded"] is False and me["profile"]["handle"].startswith("user-") and me["tolken_balance"] == 100
    r = client.patch(f"{P}/me", json={"display_name": "Ada Lovelace"}, headers=u["headers"]).json()
    assert r["profile"]["display_name"] == "Ada Lovelace" and r["profile"]["handle"].startswith("ada-lovelace")
    sid = skill_id(client, "UI design")
    r = client.put(f"{P}/me/offers", json=[{"skill_id": sid, "level": 2}], headers=u["headers"]).json()
    assert r["onboarded"] is True and r["offers"][0]["skill"]["name"] == "UI design"
    r = client.put(f"{P}/me/interests", json={"interests": ["Sensor Data", "music", "music"]}, headers=u["headers"]).json()
    assert r["interests"] == ["sensor-data", "music"]
    prof = client.get(f"{P}/profiles/{r['profile']['handle']}").json()
    assert prof["offers"][0]["level"] == 2
    assert client.get(f"{P}/me").status_code == 401


def test_profile_and_activity(client):
    maya = client.get(f"{P}/profiles/maya").json()
    assert maya["profile"]["handle"] == "maya" and maya["offers"] and maya["projects"]
    assert set(maya["stats"]) == {"projects", "stars", "collaborations", "followers"}
    days = client.get(f"{P}/profiles/maya/activity").json()
    assert days and {"date", "count"} == set(days[0])
    assert client.get(f"{P}/profiles/nobody-here").status_code == 404


def _zip(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for path, text in files.items():
            zf.writestr(path, text)
    return buf.getvalue()


def test_source_upload_and_zip_slip(client, new_user):
    a = new_user()
    p = make_project(client, a)
    url = f"{P}/projects/{p['id']}/source"
    files = {"file": ("src.zip", _zip({"app/main.py": "print(1)\n", "app/.env": "SECRET=1", "app/.git/HEAD": "x"}), "application/zip")}
    assert client.post(url, files=files, headers=a["headers"]).status_code == 409   # source_access still none
    client.patch(f"{P}/projects/{p['id']}", json={"source_access": "open"}, headers=a["headers"])
    ok = client.post(url, files=files, headers=a["headers"])
    assert ok.status_code == 200 and ok.json() == {"file_count": 1, "skipped_count": 2}
    tree = client.get(f"{url}/tree").json()["files"]
    assert [f["path"] for f in tree] == ["main.py"]
    assert client.get(f"{url}/file", params={"path": "main.py"}).json()["content"] == "print(1)\n"
    assert client.get(f"{url}/download").json()["url"]

    evil = {"file": ("evil.zip", _zip({"../../etc/passwd": "x"}), "application/zip")}
    bad = client.post(url, files=evil, headers=a["headers"])
    assert bad.status_code == 422 and "Unsafe path" in bad.json()["detail"]
    client.delete(url, headers=a["headers"])
    assert client.get(f"{url}/tree").json()["files"] == []


def test_closing_source_hides_and_removes_it(client, new_user):
    a, b = new_user(), new_user()
    p = make_project(client, a)
    url = f"{P}/projects/{p['id']}/source"
    client.patch(f"{P}/projects/{p['id']}", json={"source_access": "open"}, headers=a["headers"])
    files = {"file": ("src.zip", _zip({"main.py": "print(1)\n"}), "application/zip")}
    assert client.post(url, files=files, headers=a["headers"]).status_code == 200
    assert client.get(f"{url}/tree", headers=b["headers"]).json()["files"]

    client.patch(f"{P}/projects/{p['id']}", json={"source_access": "none"}, headers=a["headers"])
    for path in ("tree", "download"):
        assert client.get(f"{url}/{path}", headers=b["headers"]).status_code == 404
    assert client.get(f"{url}/file", params={"path": "main.py"}, headers=b["headers"]).status_code == 404
    assert client.get(f"{url}/tree").status_code == 404
    assert client.get(f"{url}/tree", headers=a["headers"]).json()["files"] == []   # owner sees it, and it was removed
    assert client.get(f"{P}/projects/{p['id']}").json()["has_source"] is False


def test_seeded_source_tree(client, seeded):
    pid = seeded("project", "plant-monitor")
    paths = [f["path"] for f in client.get(f"{P}/projects/{pid}/source/tree").json()["files"]]
    assert "firmware/main.cpp" in paths and not any("node_modules" in x for x in paths)
    f = client.get(f"{P}/projects/{pid}/source/file", params={"path": "firmware/main.cpp"}).json()
    assert "analogRead" in f["content"]
    assert client.get(f"{P}/projects/{pid}").json()["has_source"] is True
    assert client.get(f"{P}/projects/{pid}/source/file", params={"path": "nope"}).status_code == 404
