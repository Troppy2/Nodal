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
    url = f"{P}/feed/stories"
    assert client.get(url).status_code == 401
    assert client.get(url, headers={"Authorization": "Bearer junk"}).status_code == 401
    assert client.get(url, headers=auth(aud="anon")).status_code == 401
    assert client.get(url, headers=auth(secret="x" * 40)).status_code == 401
    assert client.get(url, headers=auth(exp=-120)).status_code == 401
    # a bad token on a public endpoint is still rejected rather than silently ignored
    assert client.get(f"{P}/feed", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_feed_shape_anonymous():
    r = client.get(f"{P}/feed?tab=for_you")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "next_cursor"}
    post = body["items"][0]
    for k in ["id", "title", "stage", "type", "cover", "owner", "needs", "tags", "star_count",
              "comment_count", "people_fit", "badges", "viewer_starred"]:
        assert k in post
    assert set(post["cover"]) == {"pattern", "tint"}
    assert set(post["badges"]) == {"market_verdict", "cool_score"}
    assert body["next_cursor"] == "10"
    page2 = client.get(f"{P}/feed?tab=for_you&cursor=10").json()
    assert not {p["id"] for p in page2["items"]} & {p["id"] for p in body["items"]}


def test_feed_ideas_filter_and_bad_tab():
    items = client.get(f"{P}/feed?tab=ideas").json()["items"]
    assert items and all(i["stage"] == "idea" for i in items)
    assert client.get(f"{P}/feed?tab=nope").status_code == 422
    assert client.get(f"{P}/feed?tab=following").json()["items"] == []


def test_stories_shape(new_user):
    u = new_user()
    r = client.get(f"{P}/feed/stories", headers=u["headers"])
    assert r.status_code == 200
    for s in r.json():
        assert set(s) == {"profile", "tag", "trade"}
        assert s["tag"] in ("swap", "ring", None)


def test_hs256_refused_without_secret(monkeypatch):
    tok = token(secret="dev-secret-change-me-dev-secret-change-me")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "")
    assert client.get(f"{P}/feed/stories", headers={"Authorization": f"Bearer {tok}"}).status_code == 401
