"""Seed demo content. Idempotent: ids are stable UUIDs derived from handles and slugs, writes are upserts.

Run from backend/:  .venv\\Scripts\\python -m scripts.seed
Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.
"""

import io
import json
import re
import zipfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.db import service_client
from app.services.source_service import ingest

from .seed_data import COMMENTS, FOLLOWS, PEOPLE, PROJECTS, SKILLS, STARS

NS = uuid.UUID("6f1c2a52-8f0e-4c7e-9a43-0b7d6f3e2c11")
FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def uid(kind: str, key: str) -> str:
    return str(uuid.uuid5(NS, f"{kind}:{key}"))


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def seed_skills(sb) -> dict[str, int]:
    rows = [{"name": n, "slug": slugify(n), "category": cat} for cat, names in SKILLS.items() for n in names]
    sb.table("skills").upsert(rows, on_conflict="slug").execute()
    return {r["name"]: r["id"] for r in sb.table("skills").select("id,name").execute().data}


def seed_people(sb, skill_ids: dict[str, int]) -> dict[str, str]:
    existing = {u.id for u in sb.auth.admin.list_users(page=1, per_page=1000)}
    ids = {}
    for handle, (name, bio, interests, balance, offer_list) in PEOPLE.items():
        pid = uid("profile", handle)
        ids[handle] = pid
        if pid not in existing:
            # Seed accounts have no password; nobody signs in as them. The trigger creates the profile row.
            sb.auth.admin.create_user({"id": pid, "email": f"{handle}@seed.nodal.local", "email_confirm": True,
                                       "user_metadata": {"name": name}})
        sb.table("profiles").update({
            "handle": handle, "display_name": name, "bio": bio, "interests": interests, "tolken_balance": balance,
        }).eq("id", pid).execute()
        sb.table("profile_offers").delete().eq("profile_id", pid).execute()
        sb.table("profile_offers").insert(
            [{"profile_id": pid, "skill_id": skill_ids[s], "level": lvl} for s, lvl in offer_list]
        ).execute()
    return ids


def seed_projects(sb, skill_ids: dict[str, int], people: dict[str, str]) -> dict[str, str]:
    ids = {}
    for slug, p in PROJECTS.items():
        proj_id = uid("project", slug)
        ids[slug] = proj_id
        sb.table("projects").upsert({
            "id": proj_id, "owner_id": people[p["owner"]], "type": p["type"], "title": p["title"],
            "summary": p["summary"], "readme_md": p.get("readme"), "stage": p["stage"],
            "source_access": p.get("source", "none"),
        }).execute()
        sb.table("project_tags").delete().eq("project_id", proj_id).execute()
        sb.table("project_tags").insert([{"project_id": proj_id, "tag": t} for t in p["tags"]]).execute()
        sb.table("project_needs").upsert([
            {"id": uid("need", f"{slug}:{skill}"), "project_id": proj_id, "skill_id": skill_ids[skill],
             "note": note, "bounty_tolken": bounty, "status": "open"}
            for skill, note, bounty in p["needs"]
        ]).execute()
        sb.table("project_members").upsert({
            "project_id": proj_id, "profile_id": people[p["owner"]], "role": "owner", "share_bps": 10000,
            "status": "joined",
        }).execute()
    return ids


def seed_social(sb, people: dict[str, str], projects: dict[str, str]) -> None:
    sb.table("follows").upsert(
        [{"follower_id": people[a], "followee_id": people[b]} for a, b in FOLLOWS]
    ).execute()
    sb.table("project_stars").upsert(
        [{"profile_id": people[h], "project_id": projects[s]} for h, s in STARS]
    ).execute()
    sb.table("comments").upsert([
        {"id": uid("comment", f"{slug}:{i}"), "project_id": projects[slug], "author_id": people[h], "body": body}
        for i, (slug, h, body) in enumerate(COMMENTS)
    ]).execute()


def seed_research(sb, people: dict[str, str], projects: dict[str, str]) -> None:
    """The demo idea's checks, stored so the demo never waits on the network. Labeled as a sample."""
    fixture = json.loads((FIXTURES / "research_report.json").read_text(encoding="utf-8"))
    sb.table("research_runs").upsert({
        "id": uid("research", "soil-choir"), "project_id": projects["soil-choir"],
        "requested_by": people["inah"], "status": "done", "mode": "fixture", "is_public": True,
        "checks": ["market", "cool"], "report": fixture["report"], "sources": fixture["sources"],
        "cool": fixture["cool"], "idea_hash": "seed", "model": "fixture",
        "steps": [{"at": "seed", "label": label} for label in fixture["steps"]],
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }).execute()


SAMPLE_SOURCE = {
    "plant-monitor": {
        "README.md": "# Plant monitor\n\nSoil moisture and light sensor with an e-ink display.\n",
        "platformio.ini": "[env:esp32dev]\nplatform = espressif32\nboard = esp32dev\nframework = arduino\n",
        "firmware/main.cpp": (
            "#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\n"
            "void loop() {\n  int moisture = analogRead(34);\n  Serial.println(moisture);\n"
            "  delay(600000);  // TODO: deep sleep instead of delay\n}\n"
        ),
        "firmware/display.cpp": "// e-ink status words: thirsty, fine, too dark\n",
        "hardware/BOM.csv": "part,qty\nESP32-WROOM-32,1\ncapacitive soil sensor,1\n2.13in e-ink,1\n",
        "docs/wiring.md": "# Wiring\n\nSensor to GPIO34, display on SPI.\n",
    },
    "dungeon-drift": {
        "README.md": "# Dungeon Drift\n\nEvery floor is a track. Drift to charge attacks.\n",
        "project.godot": "[application]\nconfig/name=\"Dungeon Drift\"\n",
        "scripts/kart.gd": (
            "extends CharacterBody2D\n\nvar drift := 0.0\n\nfunc _physics_process(delta):\n"
            "\tdrift = lerp(drift, Input.get_axis(\"left\", \"right\"), 0.1)\n"
        ),
        "scenes/floor_4.tscn": "[gd_scene format=3]\n",
    },
    "tide-prints": {
        "README.md": "# Tide Prints\n\nRiso prints from a year of tide sensor data.\n",
        "generate.py": "import csv\n\nrows = list(csv.DictReader(open('tides.csv')))\nprint(len(rows), 'readings')\n",
        "tides.csv": "time,height_m\n2026-01-01T00:00,1.2\n2026-01-01T06:00,0.4\n",
    },
}


def seed_source(projects: dict[str, str]) -> None:
    """Three open-source projects get a small sample zip, through the same ingestion as uploads."""
    for slug, files in SAMPLE_SOURCE.items():
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for path, text in files.items():
                zf.writestr(f"{slug}/{path}", text)
            zf.writestr(f"{slug}/node_modules/skip.js", "// skipped by ingestion")
        ingest(projects[slug], buf.getvalue())


def main() -> None:
    sb = service_client()
    skill_ids = seed_skills(sb)
    people = seed_people(sb, skill_ids)
    projects = seed_projects(sb, skill_ids, people)
    seed_social(sb, people, projects)
    seed_research(sb, people, projects)
    seed_source(projects)
    print(f"Seeded {len(skill_ids)} skills, {len(people)} people, {len(projects)} projects.")


if __name__ == "__main__":
    main()
