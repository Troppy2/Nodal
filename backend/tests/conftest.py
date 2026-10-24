"""Integration fixtures. Needs local Supabase running (`npx supabase start`) and the seed loaded
(`python -m scripts.seed`). Each `new_user()` is a real anonymous Supabase user, deleted after the test."""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import service_client
from app.main import app
from scripts.seed import uid

P = "/api/v1"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def new_user():
    made = []

    def make() -> dict:
        r = httpx.post(f"{settings.supabase_url}/auth/v1/signup", headers={"apikey": settings.supabase_anon_key}, json={})
        r.raise_for_status()
        body = r.json()
        user = {"id": body["user"]["id"], "token": body["access_token"],
                "headers": {"Authorization": f"Bearer {body['access_token']}"}}
        made.append(user["id"])
        return user

    yield make
    for user_id in made:
        service_client().auth.admin.delete_user(user_id)


@pytest.fixture
def seeded():
    """Stable ids from the seed: seeded("profile", "maya"), seeded("project", "plant-monitor")."""
    return uid
