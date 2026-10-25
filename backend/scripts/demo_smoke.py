"""Rehearsal check: runs the docs/DEMO.md story through the API and cleans up after itself.

    python -m scripts.demo_smoke          # backend must be running on :8010
    python -m scripts.demo_smoke --keep   # leave the project behind to inspect

Cleanup also deletes the invite messages it sent and moves the 50 Tolken back from rin to maya.
"""
import sys, time, json, urllib.request
A = "http://localhost:8010/api/v1"
def call(m, p, tok=None, body=None):
    req = urllib.request.Request(A + p, method=m, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + tok} if tok else {})})
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read() or "null")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"FAIL {m} {p}: {e.code} {e.read().decode()[:300]}")
def step(n, msg): print(f"[{n}] {msg}")
def login(name):
    r = call("POST", "/auth/name", body={"name": name}); return r.get("access_token") or r["session"]["access_token"]
maya, rin = login("maya"), login("rin")
me_rin = call("GET", "/me", rin); rin_id = me_rin["profile"]["id"]
skills = {s["name"]: s["id"] for s in call("GET", "/skills")}
step(1, "maya posts idea")
p = call("POST", "/projects", maya, {"title": "Smoke Test Idea", "summary": "Plants that sing when watered", "type": "hardware",
     "stage": "idea", "tags": ["sensor-data"], "needs": [{"skill_id": skills["Sound design"], "bounty_tolken": 50}]})
pid = p["id"]; need = p["needs"][0]["id"]
step(2, "market + cool check")
run = call("POST", f"/projects/{pid}/research", maya, {"checks": ["market", "cool"]})
for _ in range(30):
    r = call("GET", f"/research/{run['id']}", maya)
    if r["status"] in ("done", "failed"): break
    time.sleep(1)
print("   research:", r["status"], (r.get("report") or {}).get("verdict"))
step(3, "promote to building")
call("PATCH", f"/projects/{pid}", maya, {"stage": "building"})
step(4, "matches include rin?")
ms = call("GET", f"/projects/{pid}/matches")
print("   ", [(m["profile"]["handle"], m["skill"]["name"]) for m in ms][:5])
step(5, "rin sees it in Needs you?")
print("   ", any(x["project"]["id"] == pid for x in call("GET", "/me/matches", rin)))
step(6, "maya invites rin over DM")
inv = call("POST", f"/messages/{rin_id}/invite", maya, {"project_id": pid, "skill_id": skills["Sound design"], "body": "Want to score this?"})
mid = inv.get("id") or inv.get("message", {}).get("id")
step(7, "rin accepts invite")
call("POST", f"/messages/{mid}/accept-invite", rin)
step(8, "maya funds bounty")
before = call("GET", "/me/tolken", rin)
call("POST", f"/projects/{pid}/needs/{need}/fund", maya)
step(9, "rin submits work")
call("POST", f"/projects/{pid}/needs/{need}/submit-work", rin)
step(10, "maya confirms")
d = call("POST", f"/projects/{pid}/needs/{need}/confirm-work", maya)
print("   need:", d["needs"][0]["status"])
after = call("GET", "/me/tolken", rin)
print("   rin tolken before/after:", json.dumps(before)[:150], "|", json.dumps(after)[:150])
if "--keep" not in sys.argv:
    from app.db import service_client
    t = service_client().table
    t("messages").delete().eq("project_id", pid).execute()
    call("DELETE", f"/projects/{pid}", maya)
    for handle, delta in (("rin", -50), ("maya", 50)):
        prof = t("profiles").select("id,tolken_balance").eq("handle", handle).execute().data[0]
        t("profiles").update({"tolken_balance": prof["tolken_balance"] + delta}).eq("id", prof["id"]).execute()
    print("cleaned up")
