# Handoff — Nodal

**Date:** 2026-10-24 · **Branch:** `main` · **State:** working hackathon build, not deployed

Nodal is a social app for finding collaborators: post an idea or project with the skills it needs, get matched both ways, spot swaps and 3-way rings, invite people over DM, and fund bounties in **Tolken** (an in-app currency — there is no real money).

This document is the handoff for whoever picks the repo up next. The specs remain the source of truth: [`DESIGN.md`](DESIGN.md), [`BACKEND.md`](BACKEND.md), [`FRONTEND.md`](FRONTEND.md), and the run guide [`RUNNING.md`](RUNNING.md). A separate audit of what is built versus exposed in the UI is in [`FEATURE_GAPS.md`](FEATURE_GAPS.md).

## 1. Where things stand

- **All branches are merged into `main`** (`claude/project-thread-0ibtsj`, `claude/project-thread-q0nqcw`, `docs/spec`). No branch is ahead of `main`.
- **Backend is real**, not mocked: FastAPI on Supabase Postgres/Auth/Storage, with 59 endpoints, versioned migrations, and a seeded demo world.
- **Frontend is wired to that API** end to end: landing, onboarding, feed, explore, create, project/results/team, inbox with DMs, profile, notifications, image uploads.
- **Not deployed.** There is no Dockerfile, Render/Railway/Vercel config, or CI workflow. It runs locally (or with hosted Supabase) as described in `RUNNING.md`.
- **Verification:** frontend `tsc`, `eslint`, and `next build` are clean. Backend tests (49) pass individually; a full run against hosted Supabase is flaky (network/rate limits). Use the local Supabase stack for a reliable suite (see §8).

## 2. Stack and architecture

| Piece | Detail |
| --- | --- |
| Frontend | Next.js 15.5.28 (App Router), React 19, Tailwind v4, `@base-ui/react`, Lucide, Sonner |
| Backend | FastAPI (Pydantic v2), Uvicorn, SlowAPI rate limiting, Supabase Python client |
| Database / auth / storage | Supabase Postgres with RLS, Supabase Auth, public `images` bucket |
| API port | `8010` in local dev (`/api/v1`, OpenAPI at `/docs`) |
| Frontend port | `3000` by default; CORS accepts any localhost port |

Backend shape worth knowing before editing:

- `backend/app/world.py` builds an in-memory **cached world** (profiles, projects, needs, offers, stars, follows, members). `InvalidateOnWrite` middleware in `main.py` clears it after every POST/PATCH/PUT/DELETE, so reads stay fast and writes are immediately visible.
- `backend/app/slugs.py` accepts `/projects/{slug}` as well as UUIDs.
- Name-only sign-in (`POST /auth/name`) mints a real Supabase session; `NAME_SIGNIN_ENABLED=false` disables it. Anyone can sign in as anyone while it is on — fine for the demo only.
- Tolken bounties live in `tolken_ledger`; funding/releasing moves balances through a service-role function.
- Project invites and their follow-up are **messages** (`messages` table, kinds `invite` / `nudge`); the owner’s confirmation and the invitee’s DM are the same row.

## 3. Repo map

```
backend/app/
  main.py               app wiring, CORS, cache invalidation
  routers/              auth, projects, comments, collab, feed, graph, ideas,
                        inbox, matches, me, messages, notifications, profiles,
                        recommendations, research, skills, social, source,
                        team, tolken, upload
  services/             matching, graph/cycles, cards, research pipeline,
                        source ingestion, Tolken, LLM/web research
  world.py              cached read model
backend/supabase/migrations/   schema, RLS, slugs, messages (apply in order)
backend/scripts/seed.py        idempotent demo data (people, projects, rings, zips)
backend/tests/                 integration tests against a real Supabase

frontend/app/
  page.tsx              signed-out landing (sign-in card + cover art)
  feed/ explore/ create/ onboarding/
  projects/[id]/{,results,team}/
  inbox/ u/[handle]/ login/
frontend/components/    shell, feed, project, inbox (requests + DMs), profile,
                        people graph, onboarding, checks, forms, ui
frontend/lib/           api client, session, types, hooks, styles
```

## 4. Environment variables

Backend `backend/.env` (names are exact; see `backend/.env.example`):

```dotenv
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=        # empty unless the project signs legacy HS256 tokens
FRONTEND_ORIGIN=http://localhost:3000
NAME_SIGNIN_ENABLED=true
RESEARCH_MODE=fixture       # live needs LLM_* and TINYFISH_API_KEY
```

Frontend `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8010/api/v1
```

Only the **anon** key may reach the browser. The frontend values are still copied from the backend by hand — issue [#5](https://github.com/Troppy2/Nodal/issues/5) covers generating them so they cannot drift.

## 5. Running it

Full instructions, ports, seeding, hosted-Supabase setup, and troubleshooting are in [`RUNNING.md`](RUNNING.md). Short version:

```bash
# backend/
npx supabase start
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.seed
uvicorn app.main:app --reload --port 8010

# frontend/
npm install && npm run dev
```

Open `http://localhost:3000`, sign in with a name, finish onboarding. Seeded people (`maya`, `rin`, `dev`, `sam`, …) sign in by name and land on populated data.

## 6. What works today

- **Landing + auth:** landing page, name-only sign-in, onboarding (skills, interests, follows).
- **Feed:** For you / Following / Ideas, composer, story row of swaps/rings, infinite “load more”, sidebar that collapses to icons.
- **Projects:** create/edit/delete, covers and avatars via image upload, needs, comments, source browsing, star/follow, team shares, Tolken bounty fund/release/submit/confirm, stage changes.
- **Matching:** ranked matches both directions, project people graph, swap and ring detection, inbox invite flow.
- **Ideas:** market check and cool factor (fixture or live research), public report toggle.
- **Inbox:** requests, sent, Alerts (notifications), Messages (DMs, invites, nudges), custom 2-way swaps.
- **Profile:** offers/interests editing, contribution graph, projects/ideas/starred, Tolken history, DM entry point.
- **Explore:** search and filters (the “Shipped” chip has replaced the spec’s “Needs you”).

## 7. Known gaps and risks

Detailed list: [`FEATURE_GAPS.md`](FEATURE_GAPS.md). The ones to know before a demo:

1. **Backend-only features with no screen:** source zip upload/delete, intersections feed, idea suggestions, `/me/matches` (“projects that need me”), recommendation dismiss.
2. **Bounty submit/confirm is permissive:** `submit-work` has no membership check, and `confirm-work` funds/releases inside `try/except: pass` — a failed release marks the need filled without moving Tolken. Project/need deletion has the same silent-refund pattern.
3. **Notifications** are a second path (their own endpoint/table reads), which contradicts the “invites are DMs” rule in `CLAUDE.md`; unused `collab`/`invite` kinds are declared.
4. **Uploads** create the `images` bucket at runtime and accept any `image/*`, including SVG. That is convenient for a hackathon, not a hardened upload path.
5. **Seed noise:** 100 generated profiles with names like “Mobile game 2” dilute the graph; the “one ring lights up” demo moment is weaker than intended.
6. **Docs drift:** some spec pages still describe GitHub/magic-link auth, React Flow/TanStack Query, and old routes.
7. **No deployment or CI**; no production hardening (rate limits are in-process, name-only auth is unsafe, no backups).

## 8. Tests

```bash
cd backend && .venv\Scripts\activate && pytest        # integration, needs Supabase + seed
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

There are 49 backend tests. They create real Supabase users and clean up after themselves. Against **hosted** Supabase the whole suite can fail on network/rate-limit hiccups while passing when rerun; run against local Supabase (`npx supabase start`) when you need a trustworthy result. Add tests for the newer endpoints (`upload/image`, `submit-work`/`confirm-work`, custom swaps, notifications, project/comment deletes) — they have none yet.

## 9. Suggested next steps

1. Close the silent-failure holes in bounty submit/confirm and refunds; add a membership check and surface errors instead of swallowing them.
2. Add the missing UIs that the demo depends on: source upload, intersections, “projects that need me”.
3. Generate frontend env from the backend (issue #5) and add CI that runs `tsc`, `lint`, `build`, and `pytest`.
4. Trim or curate seed data so the swap/ring graph reads clearly on stage.
5. Harden before any public deployment: turn off name-only sign-in, restrict uploads (MIME allow-list without SVG), move rate limiting off-process, add deploy configs.
6. Reconcile `BACKEND.md` / `FRONTEND.md` with the implemented API and routes.

## 10. Useful links

- Slides: [`Nodal-Social-Hack-2026-slides.pdf`](Nodal-Social-Hack-2026-slides.pdf)
- Demo script: [`DEMO.md`](DEMO.md) · what to show and why: [`DEMO_GUIDE.md`](DEMO_GUIDE.md)
- Run guide: [`RUNNING.md`](RUNNING.md)
- Gap audit: [`FEATURE_GAPS.md`](FEATURE_GAPS.md)
- Product/design: [`DESIGN.md`](DESIGN.md)
- Backend spec: [`BACKEND.md`](BACKEND.md)
- Frontend spec: [`FRONTEND.md`](FRONTEND.md)
- Env sync issue: [#5](https://github.com/Troppy2/Nodal/issues/5)
- 2026-10-24: Feed gains **Needs you** (`/me/matches`) and **Intersections** (`/feed/intersections`) tabs (`frontend/components/feed/Intersections.tsx`, `FeedTabs.tsx`). Intersections endpoint now dedupes A/B pairs and returns `other: ProjectCard`. tsc + eslint clean; checked in browser as maya.
- 2026-10-24: Graph `fills` edges now keep each person's best-scoring skill (was the worst), so the graph and the match panel agree (Soil Choir / Rin). Sample market report fixture now fills `market_size` and `business_models`. Files: `backend/app/services/graph.py`, `backend/fixtures/research_report.json`. pytest -k graph/cycle/feed: 10 passed.
- 2026-10-24: Demo flow made coherent end to end; script in `docs/DEMO.md`, rehearsal check `backend/scripts/demo_smoke.py`. Fixes: inbox tabs no longer hide Messages; invite cards show their own project and persist "Joined"; team members see "On the team" and Submit work instead of Join/Offer; project tab survives refetch (`?tab=`); results-page person panel and graph sized for the narrow column (6 people). Without the need_completion migration, submitted/completed state and the contribution graph now fall back to the Tolken ledger (bounty needs only). Full browser walkthrough maya to rin passed. tsc + lint clean; pytest 48 passed, 2 failed (both fail on the previous commit too: missing migration, and a leftover `%` profile).
- 2026-10-24: Inbox swaps/rings reworked as "Trades for you": each row shows what you give and what you get, swaps listed before rings, one-line definition of swap vs ring, button says Propose. Removed the custom swap dialog from the UI (it asked for raw project IDs and always sent skill 1); `POST /cycles/custom-swap` still exists. Files: `frontend/components/inbox/InboxView.tsx`, `RingInviteCard.tsx`.
- 2026-10-24: Added `docs/DEMO_GUIDE.md` (features to show, mapped to judging criteria) and a root `.gitignore` for `.playwright-mcp/`.
- 2026-10-24: Added `docs/TALK.md`, the three-part talk outline for the presentation.
- 2026-10-25: Merged `tarakesh-inbox-sidebar` (includes `Dropdown`) into `inah`: inbox split into Requests / Messages / Alerts pages in the sidebar (`/inbox` redirects), My Projects page, Tolken pill, Projects feed tab (feed now has 6 tabs), custom swap dialog with person search and project dropdowns. Ported the give/get "Trades for you" rows to `RequestsView.tsx`; removed the now-unused `InboxView.tsx`. Fixed `POST /cycles/custom-swap`, which crashed on every call: skills are now optional and the server picks the open need each side offers best. Tested custom swap in the browser. pytest: 48 passed, 3 failed: the 2 known ones, plus `test_seeded_ring_lights_up_in_plant_monitor_graph`, which also fails on the old graph code (current data pushes the ring past the 40-node cap).
- 2026-10-25: Deleted 6 test projects from hosted data (efficient miner, Mobile game 1-3, two Scraps; one ◈10 bounty refunded). The seeded ring test passes again, so the seed trim is no longer needed. Profile search: input is sanitised before reaching the PostgREST `or_` filter (filter injection).
- 2026-10-25: TALK.md, DEMO_GUIDE.md and DEMO.md share one structure: Intersect → Connect → Collaborate. The talk includes the speech fixes; the guide groups features by beat.
- 2026-10-25: Home feed tabs cut to For you, Following, Needs you, Intersections. Ideas and Projects were removed because the Projects page and Explore already cover them. The backend still accepts `tab=ideas|projects`.
- 2026-10-25: Added the presentation deck as `docs/Nodal-Social-Hack-2026-slides.pdf`.
- 2026-10-25: Slides PDF gained a hook slide (page 2: "The job market is f*****."). TALK.md opens with the hook line.
- 2026-10-25: Removed the Intersections feed tab; `Intersections.tsx` is now `NeedsYou.tsx`. `GET /feed/intersections` still exists. DEMO step 1 now uses the For you "People to build with" row.
