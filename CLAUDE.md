# Nodal — agent guide

Social Hack 2026 (Social Coding Club). Social app for finding collaborators
around projects: matching, graph intersections, research agent, recommendations,
social feed, onboarding, and Tolken, the in-app currency.

Full specs live in [docs/DESIGN.md](docs/DESIGN.md),
[docs/BACKEND.md](docs/BACKEND.md), [docs/FRONTEND.md](docs/FRONTEND.md).
Read the relevant one before changing that side of the app.

## Product rules

- No money anywhere. Tolken (`◈`) is the in-app currency; bounties are funded and released in Tolken. No checkout, prices, or payouts.
- Ideas and projects are one entity, separated by `stage`. Market and cool-factor checks are for ideas only; projects show people who fit.
- Onboarding (`/onboarding`, three steps) collects skills, interests, and follows — the inputs matching reads.
- Invites are DMs: an owner's project invite and the follow-up are messages in one thread (`messages` table). Don't add a separate notification path.

## Layout

| Path | Stack |
|------|-------|
| `backend/` | FastAPI + Supabase (Python, `.venv`) |
| `frontend/` | Next.js 15 App Router + React 19 + Tailwind 4 + shadcn/base-ui |
| `docs/` | Design, backend, frontend specs — treat as source of truth |

## Commands

Backend (from `backend/`):
```
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8010   # http://localhost:8010/docs
pytest
```

Frontend (from `frontend/`): `npm run dev`, `npm run build`, `npm run lint`.

Do not add dependencies without asking.

## Worker agents

Use OpenCode workers for bulk code writing to save Claude usage. Claude plans,
researches and reviews; workers write code.

```
opencode run -m "openrouter/<vendor>/<model>" --title "short-task-name" "<spec>"
```

Free workers:

- `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` — default worker
- `openrouter/poolside/laguna-s-2.1:free` — coding-focused
- `openrouter/cohere/north-mini-code:free` — fast, code-tuned
- `openrouter/openrouter/free` — router fallback

Paid fallback only after free models fail: `openrouter/deepseek/deepseek-v4-flash`,
`openrouter/qwen/qwen3-coder-flash`.

Rules:

- Always pass `-m`; the default model has no credentials.
- You research and write narrow specs (files, line ranges, exact change).
  Workers do not explore the repo — that burns tokens.
- One small change per worker. Parallel workers must touch different files;
  give each its own branch or worktree.
- Review every worker diff, run `pytest` / `npm run build` before keeping it.
- Run workers on a feature branch so `git diff` and `git restore` are the undo.
- Never commit or push without my approval.

Windows parallel workers (PowerShell):
```powershell
$models = @("nvidia/nemotron-3-ultra-550b-a55b:free","poolside/laguna-s-2.1:free")
$models | ForEach-Object -Parallel {
  opencode run -m "openrouter/$_" "<task>" *> "worker_$($_ -replace '[/:]','_').log"
} -ThrottleLimit 2
```

Gotcha: OpenCode writes logs to `C:\Users\ijdar\.local\share\opencode\log`.
Inside a restricted sandbox that write fails with `EPERM`; run workers from a
normal terminal instead.

## Task spec template

```
Context: <what the app is and why this change>
Files to edit: <paths, with line ranges>
Do not touch: <everything else>
Change: <exact behavior wanted, inputs and outputs>
Conventions: <naming, style, no new deps>
Done when: <e.g. pytest backend/tests/test_x.py passes>
Do not commit or push.
```
