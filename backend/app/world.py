"""The world: every public row matching and discovery need, held in memory and indexed.

Feed, cards, profiles, graph, matches, stories and recommendations all read from one `World`, so those
endpoints cost no database round trips once it is loaded. Loading runs its queries in parallel (one
round trip of wall time, ~0.3 s hosted) and happens at most once per write:

- `main.py` calls `invalidate()` after every non-GET request, so a write is visible on the next read.
- Background work that writes (research runs) calls `invalidate()` itself.
- `MAX_AGE_S` bounds staleness from writes that bypass the API (the SQL editor, other server processes).

Private or transactional data (Tolken, team shares, inbox, research reports, the signed-in profile)
is never served from here: those endpoints query live. At demo scale the world is a few hundred rows;
past ~10k projects this should become per-request queries again.
"""

import threading
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from functools import cached_property

from .db import parallel, select_all, service_client

MAX_AGE_S = 20
PROFILE_COLS = "id,handle,display_name,avatar_url,bio,interests,created_at"
PROJECT_COLS = ("id,slug,owner_id,type,title,summary,readme_md,stage,cover_url,repo_url,demo_url,source_access,"
                "source_zip_path,created_at")


@dataclass
class World:
    skills: dict[int, dict]
    profiles: dict[str, dict]
    projects: dict[str, dict]
    needs: list[dict]                                   # every need, open and filled
    offers: dict[str, dict[int, int]]                   # profile -> {skill_id: level}, available only
    tags: dict[str, set[str]]                           # project -> tags
    stars: dict[str, set[str]]                          # project -> profiles who starred
    comment_count: Counter
    follows: dict[str, dict[str, str]]                  # follower -> {followee: followed_at}, newest first
    members: dict[str, list[dict]]                      # project -> project_members rows, oldest first
    requested: dict[str, set[tuple[str, int]]]          # profile -> {(project_id, skill_id)} asked to help
    dismissed: dict[str, set[str]]                      # profile -> dismissed recommendation project ids
    runs: list[dict]                                    # finished research runs, newest first (badge fields only)
    loaded_at: float = field(default_factory=time.monotonic)

    # ---- indexes ----

    @cached_property
    def by_slug(self) -> dict[str, str]:
        return {p["slug"]: pid for pid, p in self.projects.items()}

    @cached_property
    def by_handle(self) -> dict[str, str]:
        return {p["handle"]: pid for pid, p in self.profiles.items()}

    @cached_property
    def owned(self) -> dict[str, list[str]]:
        """profile -> project ids, newest first."""
        out: dict[str, list[str]] = defaultdict(list)
        for pid in self.newest_first(self.projects):
            out[self.projects[pid]["owner_id"]].append(pid)
        return out

    @cached_property
    def needs_by_project(self) -> dict[str, list[dict]]:
        out: dict[str, list[dict]] = defaultdict(list)
        for n in self.needs:
            out[n["project_id"]].append(n)
        return out

    @cached_property
    def open_needs(self) -> list[dict]:
        return [n for n in self.needs if n["status"] == "open" and n["project_id"] in self.projects]

    @cached_property
    def offerers(self) -> dict[int, list[str]]:
        """skill -> profiles offering it, by handle."""
        out: dict[int, list[str]] = defaultdict(list)
        for prof in sorted(self.offers, key=lambda i: self.profiles.get(i, {}).get("handle", "")):
            for sid in self.offers[prof]:
                out[sid].append(prof)
        return out

    @cached_property
    def followers(self) -> dict[str, set[str]]:
        out: dict[str, set[str]] = defaultdict(set)
        for follower, followees in self.follows.items():
            for f in followees:
                out[f].add(follower)
        return out

    @cached_property
    def interests(self) -> dict[str, set[str]]:
        return {pid: set(p.get("interests") or []) for pid, p in self.profiles.items()}

    @cached_property
    def matching(self):
        """Skill-fit edges and cycles over this world, built once per load."""
        from .services.matching import Matching
        return Matching(self)

    def newest_first(self, project_ids) -> list[str]:
        return sorted(project_ids, key=lambda pid: self.projects[pid]["created_at"], reverse=True)

    def project_id(self, ref: str) -> str | None:
        """A project id from an id or a slug."""
        return ref if ref in self.projects else self.by_slug.get(ref)

    def people(self, ids) -> dict[str, dict]:
        """Profiles by id. Anyone who signed up since the last load is fetched live, so a brand-new
        account's first comment or request still shows its author."""
        ids = {i for i in ids if i}
        out = {i: self.profiles[i] for i in ids if i in self.profiles}
        missing = list(ids - out.keys())
        if missing:
            out.update({r["id"]: r for r in service_client().table("profiles").select(PROFILE_COLS)
                        .in_("id", missing).execute().data})
        return out

    def badge_run(self, project_id: str, viewer_id: str | None) -> dict | None:
        """Latest finished research run this viewer may see for the project."""
        return next((r for r in self.runs if r["project_id"] == project_id
                     and (r["is_public"] or r["requested_by"] == viewer_id)), None)


def _load() -> World:
    sb = service_client()
    t = sb.table
    (skills, profiles, projects, needs, offers, tags, stars, comments, follows, members, requests, dismissals,
     runs) = parallel(
        lambda: select_all(t("skills").select("*").order("id")),
        lambda: select_all(t("profiles").select(PROFILE_COLS).order("id")),
        lambda: select_all(t("projects").select(PROJECT_COLS).order("id")),
        lambda: select_all(t("project_needs").select("id,project_id,skill_id,note,bounty_tolken,status,submitted_by,completed_by").order("id")),
        lambda: select_all(t("profile_offers").select("profile_id,skill_id,level").eq("available", True)
                           .order("profile_id").order("skill_id")),
        lambda: select_all(t("project_tags").select("project_id,tag").order("project_id").order("tag")),
        lambda: select_all(t("project_stars").select("project_id,profile_id").order("project_id").order("profile_id")),
        lambda: select_all(t("comments").select("project_id").order("id")),
        lambda: select_all(t("follows").select("follower_id,followee_id,created_at").order("created_at", desc=True)
                           .order("follower_id").order("followee_id")),
        lambda: select_all(t("project_members").select("project_id,profile_id,role,skill_id,share_bps,status,created_at")
                           .order("created_at").order("profile_id")),
        lambda: select_all(t("collab_requests").select("project_id,from_profile_id,skill_id").order("id")),
        lambda: select_all(t("recommendation_dismissals").select("profile_id,project_id").order("profile_id")
                           .order("project_id")),
        lambda: select_all(t("research_runs")
                           .select("project_id,requested_by,is_public,created_at,verdict:report->>verdict,cool:cool->overall")
                           .in_("status", ["done", "partial"]).order("created_at", desc=True).order("id")),
    )
    offer_map: dict[str, dict[int, int]] = defaultdict(dict)
    for o in offers:
        offer_map[o["profile_id"]][o["skill_id"]] = o["level"]
    tag_map: dict[str, set[str]] = defaultdict(set)
    for r in tags:
        tag_map[r["project_id"]].add(r["tag"])
    star_map: dict[str, set[str]] = defaultdict(set)
    for r in stars:
        star_map[r["project_id"]].add(r["profile_id"])
    follow_map: dict[str, dict[str, str]] = defaultdict(dict)
    for r in follows:
        follow_map[r["follower_id"]][r["followee_id"]] = r["created_at"]
    member_map: dict[str, list[dict]] = defaultdict(list)
    for r in members:
        member_map[r["project_id"]].append(r)
    requested: dict[str, set[tuple[str, int]]] = defaultdict(set)
    for r in requests:
        requested[r["from_profile_id"]].add((r["project_id"], r["skill_id"]))
    dismissed: dict[str, set[str]] = defaultdict(set)
    for r in dismissals:
        dismissed[r["profile_id"]].add(r["project_id"])
    return World(
        skills={s["id"]: s for s in skills},
        profiles={p["id"]: p for p in profiles},
        projects={p["id"]: p for p in projects},
        needs=needs, offers=offer_map, tags=tag_map, stars=star_map,
        comment_count=Counter(c["project_id"] for c in comments),
        follows=follow_map, members=member_map, requested=requested, dismissed=dismissed, runs=runs,
    )


_lock = threading.Lock()
_current: World | None = None
_version = 0                     # bumped by invalidate(); a load started before a bump is never kept


def world() -> World:
    global _current
    w = _current
    if w is not None and time.monotonic() - w.loaded_at < MAX_AGE_S:
        return w
    with _lock:
        w = _current
        if w is not None and time.monotonic() - w.loaded_at < MAX_AGE_S:
            return w
        version = _version
        fresh = _load()
        if version == _version:
            _current = fresh
        return fresh


def invalidate() -> None:
    global _current, _version
    _version += 1
    _current = None
