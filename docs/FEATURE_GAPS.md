# Feature gaps

Audit date: 2026-10-24. Sources: `DESIGN.md`, `BACKEND.md`, `FRONTEND.md`, `RUNNING.md`, all 47 commits, backend routes compared with the frontend's API calls, and a signed-out walkthrough of the running app (frontend :3002, backend :8010, hosted Supabase).

Not checked in the browser (sign-in creates a real account on hosted Supabase): feed, inbox, team, onboarding, profile editing. Those were reviewed in code only.

## 1. Backend built, no UI

| Feature | Backend | UI | Note |
|---|---|---|---|
| Source zip upload / delete | `POST`/`DELETE /projects/{id}/source` | No upload component | Owners can't add code. Buoy Watch and Park&Go show an "Open source" badge with 0 files and no Code tab. |
| ~~Intersections feed~~ (fixed: Intersections tab) | `GET /feed/intersections` returns data | Never called | Demo script step 7 depends on it. |
| Idea suggestions (LLM) | 4 `/me/idea-suggestions` endpoints | None | No "Generate ideas" screen. |
| ~~Help wanted for you~~ (fixed: Needs you tab) | `GET /me/matches` | Never called | The "projects that need me" direction has no screen. |
| Hide a recommendation | `POST /me/recommendations/{id}/dismiss` | No "Not interested" button | For you reads `/feed`; `/me/recommendations` is unused. |
| "Needs you" Explore filter | Spec only | Missing | A "Shipped" chip is in its place. |

## 2. Half-built or faked (commits 3f4ee4d → 2b91193)

- **Submit/confirm work for bounties** (`backend/app/routers/projects.py`, `submit_work` / `confirm_work`):
  - The `claimed` need status was reverted to avoid a migration. Submit work only posts a comment.
  - **No membership check.** Any signed-in user can submit work on any need and become the bounty contributor.
  - Confirm work marks the need `filled`, then funds and releases inside `try/except: pass`. If shares aren't 100% or the owner's balance is too low, the need reads filled and no Tolken moves, silently.
- **Deleting a project or need** wraps the bounty refund in `except: pass`; a failed refund loses Tolken silently.
- **Notifications** (`backend/app/routers/notifications.py`):
  - Breaks the CLAUDE.md rule "Don't add a separate notification path".
  - Declares `collab` and `invite` kinds that are never produced.
- **Undocumented, untested endpoints:** custom swaps (`/cycles/custom-swap`), `/messages/{id}/accept-invite`, `/upload/image`, project delete, comment delete, submit/confirm work. None are in `BACKEND.md`; none have tests.
- **Image upload** creates a public bucket at runtime and accepts any `image/*`, including SVG.

## 3. Seen in the browser

- **People graph highlight is meaningless.** All 24 projects have 3–10 cycles and most hit the 40-node cap. With 100 seeded profiles, the planned single ring "lighting up on cue" stands out from nothing.
- ~~**Mismatched match reason.**~~ Fixed in `graph.py`. Soil Choir results: Rin is shown filling "Generative art", but the detail panel says "Matches need: Sound design".
- **Test data in demo data:** Mobile game, Mobile game 2, Mobile game 3, two "Scraps" ideas, "efficient miner".
- ~~**Sample market report**~~ Fixed. (`backend/fixtures/research_report.json`) has empty `market_size` and `business_models`, so those sections never show.

## 4. Docs out of date

- Spec says GitHub or magic-link login; the app uses name-only sign-in. `FRONTEND.md` definition of done #1 still says GitHub/magic link.
- `FRONTEND.md` lists React Flow, TanStack Query, react-hook-form, and zod. None are installed; the graph is custom.
- `RUNNING.md` says the frontend runs on 3000; it was running on 3002.

## 5. Tests

- 13 passed, 1 failed (`test_collab_accept_creates_ledger`), which passed when rerun alone.
- The full run hit DNS errors (`getaddrinfo failed`) reaching hosted Supabase. Tests depend on the network, so results are unreliable.

## Suggested order

1. Source upload UI.
2. Membership check and real error handling for bounty submit/confirm and refunds.
3. Intersections feed UI (needed for the demo).
4. Trim seed data so the graph highlight means something.
5. Idea suggestions UI.
