# Running Nodal locally

Nodal is three processes:

| Piece | What it is | Default URL |
| --- | --- | --- |
| Supabase | Postgres, Auth, Storage (local Docker stack) | API `http://127.0.0.1:55321`, Studio `http://127.0.0.1:55323` |
| Backend | FastAPI + the matching/research/Tolken logic | `http://localhost:8010` (`/docs` for OpenAPI) |
| Frontend | Next.js 15 app | `http://localhost:3000` |

Start them in that order. The frontend calls both Supabase and the backend directly from the browser, so the two URLs in `frontend/.env.local` must match what you actually run.

## Prerequisites

- **Node.js 20+** and npm (`node -v`)
- **Python 3.11+** (`python --version`; the lock-free venv was built with 3.14)
- **Docker Desktop** for the local Supabase stack. Without Docker, use [hosted Supabase](#hosted-supabase) instead.
- `npx supabase` downloads the CLI on first use; you do not install it globally.

## Ports used by default

| Service | Port |
| --- | --- |
| Frontend | 3000 |
| Backend API | 8010 |
| Supabase API (Kong) | 55321 |
| Supabase Postgres | 55322 |
| Supabase Studio | 55323 |

The Supabase ports come from `backend/supabase/config.toml`. If another project already owns them, change them there and re-run `npx supabase start`, then copy the new values into both env files.

## One-time setup

### 1. Local Supabase

From `backend/`:

```bash
npx supabase start
```

The first start downloads images and applies every file in `backend/supabase/migrations/` in name order. Keep the output: it prints the API URL plus the anon and service keys.

```bash
npx supabase status        # print them again at any time
```

Studio is at `http://127.0.0.1:55323`; the database itself is `postgresql://postgres:postgres@127.0.0.1:55322/postgres` if you want `psql`.

### 2. Backend env

From `backend/`:

```bash
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

Fill in the values printed by `npx supabase status`:

```dotenv
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_KEY=<service_role key>
SUPABASE_JWT_SECRET=          # can stay empty: tokens are verified against JWKS
FRONTEND_ORIGIN=http://localhost:3000
RESEARCH_MODE=fixture         # fixture = no web calls; live = TinyFish + an LLM
NAME_SIGNIN_ENABLED=true      # name-only sign-in; disable anywhere real accounts live
```

Optional, only for live research: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `TINYFISH_API_KEY`.

### 3. Backend dependencies and demo data

From `backend/`:

```bash
python -m venv .venv
.venv\Scripts\activate              # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed              # 100 profiles, projects, swaps/rings, source zips
```

`scripts.seed` is idempotent; re-run it after a `supabase db reset`.

### 4. Frontend env

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_API_URL=http://localhost:8010/api/v1
```

Use the **anon** key only. The service key must never reach the browser.

> These values duplicate `backend/.env` by hand for now; see [#5](https://github.com/Troppy2/Nodal/issues/5) for the planned sync command.

### 5. Frontend dependencies

From `frontend/`:

```bash
npm install
```

## Run it

Terminal 1 — backend, from `backend/`:

```bash
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8010
```

- Health: `http://localhost:8010/api/v1/health`
- Interactive API docs: `http://localhost:8010/docs`
- Use `--reload` so edits are picked up; without it you must restart after pulling.

Terminal 2 — frontend, from `frontend/`:

```bash
npm run dev
```

Open `http://localhost:3000`.

Terminal 3 — optional: `npx supabase status` keeps the keys handy, or open Studio at `http://127.0.0.1:55323`.

## Sign in

Open `http://localhost:3000` and enter a name. That is the whole account: no email, no password. New names create a profile; existing seeded names (`maya`, `rin`, `dev`, `tomas`, `leila`) sign in as those people so you land on seeded data. After sign-in you go to onboarding (skills, interests, people to follow), then the feed.

Name-only sign-in means anyone can sign in as anyone. Keep `NAME_SIGNIN_ENABLED=false` anywhere real accounts exist.

## Smoke test

1. `GET /api/v1/health` returns `{"status":"ok"}`.
2. `http://localhost:3000/feed` shows posts once signed in.
3. Create a project at `/create`; it appears on your profile.
4. Open a project → **People who fit**; the graph shows seeded swaps/rings.
5. Open **Inbox → Messages**, invite someone from a project, and check the invite appears as a DM.

## Tests and checks

Backend (needs local Supabase running and seeded):

```bash
cd backend
.venv\Scripts\activate
pytest
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

## Common problems

**The browser says "Failed to fetch" or CORS.**
`FRONTEND_ORIGIN` in `backend/.env` must be exactly the frontend origin (`http://localhost:3000`), including the port. Restart uvicorn after changing it. `NEXT_PUBLIC_API_URL` must point at the same port the API runs on (8010 here).

**401 on every API call.**
The frontend has a stale Supabase session or key. Clear the site data for `localhost:3000`, check `NEXT_PUBLIC_SUPABASE_*` against `npx supabase status`, and sign in again.

**Backend changes do not appear.**
Uvicorn was started without `--reload`, or you changed an endpoint that the frontend dev server had already bundled — restart the backend; Next.js picks frontend edits up by itself.

**Supabase keys changed after a restart.**
`npx supabase stop` / `start` can rotate ports or keys. Re-copy `npx supabase status` into `backend/.env` and `frontend/.env.local`.

**Migration order error.**
The CLI refuses files whose timestamp is older than the last applied migration. For local development:

```bash
npx supabase migration up --include-all
```

or rebuild the database from scratch (destroys local data):

```bash
npx supabase db reset
python -m scripts.seed
```

**Docker is not available.**
Use hosted Supabase (below) and point both env files at it.

## Hosted Supabase

1. Create a Supabase project.
2. Apply the migrations to it, in filename order — either paste each file into the SQL editor, or:

   ```bash
   cd backend
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. Copy the project URL, anon key, and service key into `backend/.env`, and the URL + anon key into `frontend/.env.local`. Set `FRONTEND_ORIGIN` to the deployed frontend origin.
4. Seed and run normally:

   ```bash
   python -m scripts.seed
   uvicorn app.main:app --port 8010
   ```

`SUPABASE_JWT_SECRET` should stay empty for hosted projects that sign tokens with asymmetric keys; the API verifies them through the project JWKS.

## Project layout

| Path | Contents |
| --- | --- |
| `backend/app/` | FastAPI routers, services, models |
| `backend/supabase/migrations/` | Schema, RLS, and indexes applied by the Supabase CLI |
| `backend/scripts/` | `seed.py` demo data |
| `backend/tests/` | Integration tests (real local Supabase) |
| `frontend/app/` | Next.js routes (`/`, `/feed`, `/explore`, `/inbox`, `/projects/[id]`, `/u/[handle]`, `/onboarding`) |
| `frontend/components/` | Shell, feed, project, inbox, profile, onboarding, UI primitives |
| `docs/` | Product, backend, and frontend specs |
