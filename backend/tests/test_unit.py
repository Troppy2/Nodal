"""Unit tests that need no Supabase: rate limits, slug rewriting, idea suggestions with a fake LLM."""

import time

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
    found = {("projects", "plant-monitor"): "11111111-1111-1111-1111-111111111111",
             ("profiles", "maya"): "22222222-2222-2222-2222-222222222222"}
    monkeypatch.setattr(slugs, "_lookup", lambda table, col, value: found.get((table, value)))
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
