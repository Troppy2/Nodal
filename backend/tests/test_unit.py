"""Unit tests that need no Supabase: rate limits, slug rewriting, idea suggestions with a fake LLM."""

import time
from types import SimpleNamespace

import jwt
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import slugs
from app.config import settings
from app.ratelimit import rate_limit


def auth(sub):
    tok = jwt.encode({"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 600},
                     settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {tok}"}


def test_rate_limit_per_user():
    app = FastAPI()

    @app.post("/x")
    def x(user: dict = Depends(rate_limit("2/minute", "test-x"))):
        return {"ok": True}

    c = TestClient(app)
    assert [c.post("/x", headers=auth("rl-a")).status_code for _ in range(3)] == [200, 200, 429]
    assert c.post("/x", headers=auth("rl-b")).status_code == 200      # other users are unaffected
    assert "detail" in c.post("/x", headers=auth("rl-a")).json()


def test_slug_middleware_rewrites_projects_and_follow(monkeypatch):
    fake = SimpleNamespace(by_slug={"plant-monitor": "11111111-1111-1111-1111-111111111111"},
                           by_handle={"maya": "22222222-2222-2222-2222-222222222222"})
    monkeypatch.setattr(slugs, "world", lambda: fake)
    app = FastAPI()
    app.add_middleware(slugs.SlugMiddleware)

    @app.api_route("/{path:path}", methods=["GET", "POST"])
    def echo(path: str):
        return {"path": path}

    c = TestClient(app)
    assert c.get("/api/v1/projects/plant-monitor/matches").json()["path"] == \
        "api/v1/projects/11111111-1111-1111-1111-111111111111/matches"
    assert c.get("/api/v1/graph/projects/plant-monitor").json()["path"].endswith("11111111-1111-1111-1111-111111111111")
    assert c.post("/api/v1/profiles/maya/follow").json()["path"].endswith("2222-222222222222/follow")
    assert c.get("/api/v1/profiles/maya").json()["path"] == "api/v1/profiles/maya"       # GET by handle untouched
    assert c.get("/api/v1/projects/unknown-slug").json()["path"] == "api/v1/projects/unknown-slug"


def test_slugify():
    assert slugs.slugify("Park&Go!  v2") == "park-go-v2"
    assert slugs.slugify("???") == "project"


def test_database_errors_become_clear_statuses():
    from postgrest.exceptions import APIError

    from app import errors

    app = FastAPI()
    errors.install(app)

    @app.get("/dup")
    def dup():
        raise APIError({"message": "duplicate key", "code": "23505", "hint": None, "details": None})

    @app.get("/odd")
    def odd():
        raise APIError({"message": "something else", "code": "XX000", "hint": None, "details": None})

    c = TestClient(app)
    assert c.get("/dup").status_code == 409 and c.get("/dup").json() == {"detail": "That already exists"}
    assert c.get("/odd").status_code == 502


def test_writes_invalidate_the_world(monkeypatch):
    from app import main

    calls = []
    monkeypatch.setattr(main, "invalidate", lambda: calls.append(1))
    app = FastAPI()
    app.add_middleware(main.InvalidateOnWrite)

    @app.api_route("/x", methods=["GET", "POST", "DELETE"])
    def x():
        return {}

    c = TestClient(app)
    c.get("/x")
    assert calls == []
    c.post("/x")
    c.delete("/x")
    assert calls == [1, 1]


def test_world_reload_waits_for_invalidate(monkeypatch):
    from app import world as world_mod

    loads = []
    monkeypatch.setattr(world_mod, "_load", lambda: loads.append(1) or SimpleNamespace(loaded_at=time.monotonic()))
    world_mod.invalidate()
    world_mod.world()
    world_mod.world()
    assert len(loads) == 1                      # cached between writes
    world_mod.invalidate()
    world_mod.world()
    assert len(loads) == 2
    world_mod.invalidate()                      # leave no fake world behind for other tests


def test_keycheck_names_the_bad_key(monkeypatch):
    import base64
    import json

    from app import keycheck

    def jwt_for(role, ref="abc"):
        body = base64.urlsafe_b64encode(json.dumps({"role": role, "ref": ref}).encode()).decode().rstrip("=")
        return f"eyJhbGciOiJIUzI1NiJ9.{body}.sig"

    monkeypatch.setattr(settings, "supabase_url", "https://abc.supabase.co")
    monkeypatch.setattr(settings, "supabase_anon_key", jwt_for("anon"))
    monkeypatch.setattr(settings, "supabase_service_key", jwt_for("service_role"))
    assert keycheck.problems() == []
    monkeypatch.setattr(settings, "supabase_service_key", jwt_for("anon"))
    assert "SUPABASE_SERVICE_KEY is the 'anon' key" in keycheck.problems()[0]
    monkeypatch.setattr(settings, "supabase_service_key", jwt_for("service_role")[:30])
    assert "cut off" in keycheck.problems()[0]
    monkeypatch.setattr(settings, "supabase_service_key", "sb_secret_xyz")
    assert "legacy JWT key" in keycheck.problems()[0]
    monkeypatch.setattr(settings, "supabase_service_key", jwt_for("service_role", ref="other"))
    assert "belongs to project 'other'" in keycheck.problems()[0]
