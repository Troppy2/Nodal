"""Integration fixtures. Needs a Supabase project (local `npx supabase start` or hosted, set in .env) with the
migrations applied and the seed loaded (`python -m scripts.seed`). Each `new_user()` is a real Supabase user,
deleted after the test. Hosted projects usually have anonymous sign-ins off, so users are made with the admin API."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import service_client
from app.main import app
from app.routers.auth import _session_for
from app.world import invalidate
from scripts.seed import uid

P = "/api/v1"
TEST_JWT_SECRET = "test-only-secret-test-only-secret-test-only"


@pytest.fixture(autouse=True)
def hs256_secret(monkeypatch):
    """Unit tests mint HS256 tokens. Real projects verify through JWKS and may have no secret set."""
    if not settings.supabase_jwt_secret:
        monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_JWT_SECRET)


@pytest.fixture(autouse=True)
def fresh_world():
    """Fixtures and tests also write straight to the database, which the API's cached world can't see."""
    invalidate()


def session_headers(user_id: str) -> dict:
    """A real session for an existing user (seeded people have no password), via an admin magic link."""
    return {"Authorization": f"Bearer {_session_for(user_id)['access_token']}"}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def new_user():
    made = []

    def make() -> dict:
        res = service_client().auth.admin.create_user(
            # "user-" local part keeps the signup trigger's placeholder handle shape (user-xxxx) that onboarding replaces
            {"email": f"user-{uuid.uuid4().hex[:10]}@test.nodal.local", "email_confirm": True})
        token = _session_for(res.user.id)["access_token"]
        user = {"id": res.user.id, "token": token, "headers": {"Authorization": f"Bearer {token}"}}
        made.append(user["id"])
        return user

    yield make
    for user_id in made:
        service_client().auth.admin.delete_user(user_id)


@pytest.fixture
def seeded():
    """Stable ids from the seed: seeded("profile", "maya"), seeded("project", "plant-monitor")."""
    return uid
