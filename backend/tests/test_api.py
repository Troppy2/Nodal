import time

import jwt
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)
P = "/api/v1"


def token(aud="authenticated", secret=None, exp=3600):
    return jwt.encode(
        {"sub": "user-1", "aud": aud, "exp": int(time.time()) + exp},
        secret or settings.supabase_jwt_secret,
        algorithm="HS256",
    )


def auth(**kw):
    return {"Authorization": f"Bearer {token(**kw)}"}


def test_health():
    r = client.get(f"{P}/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_cors_allowed_and_denied():
    ok = client.get(f"{P}/health", headers={"Origin": settings.frontend_origin})
    assert ok.headers.get("access-control-allow-origin") == settings.frontend_origin
    bad = client.get(f"{P}/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_jwt_missing_invalid_wrong_aud_expired():
    assert client.get(f"{P}/feed").status_code == 401
    assert client.get(f"{P}/feed", headers={"Authorization": "Bearer junk"}).status_code == 401
    assert client.get(f"{P}/feed", headers=auth(aud="anon")).status_code == 401
    assert client.get(f"{P}/feed", headers=auth(secret="x" * 40)).status_code == 401
    assert client.get(f"{P}/feed", headers=auth(exp=-10)).status_code == 401


def test_feed_shape():
    r = client.get(f"{P}/feed?tab=for_you", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "next_cursor"}
    post = body["items"][0]
    for k in ["id", "title", "stage", "type", "cover", "owner", "needs", "star_count",
              "comment_count", "people_fit", "badges", "viewer_starred"]:
        assert k in post
    assert set(post["cover"]) == {"pattern", "tint"}
    assert set(post["badges"]) == {"market_verdict", "cool_score"}


def test_feed_ideas_filter_and_bad_tab():
    items = client.get(f"{P}/feed?tab=ideas", headers=auth()).json()["items"]
    assert items and all(i["stage"] == "idea" for i in items)
    assert client.get(f"{P}/feed?tab=nope", headers=auth()).status_code == 422


def test_stories_shape():
    r = client.get(f"{P}/feed/stories", headers=auth())
    assert r.status_code == 200
    for s in r.json():
        assert set(s) == {"profile", "tag"}
        assert s["tag"] in ("swap", "ring", None)
