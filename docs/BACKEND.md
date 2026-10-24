# BACKEND.md: Nodal (FastAPI + Supabase)

Instructions for Claude: build the backend for Nodal described here. Read `DESIGN.md` for product context. Optimize for speed to a working demo; skip anything not listed.

## Stack

- Python 3.11+, FastAPI, Pydantic v2, `uvicorn`
- `supabase` (supabase-py) and `httpx`, `python-jose` or `pyjwt` for JWT verification
- `slowapi` for rate limiting
- `python-multipart` for file uploads
- `openai` Python SDK as a generic OpenAI-compatible client (works with OpenRouter and Ollama)
- Supabase hosted: Auth, Postgres (RLS), Storage

## Layout

```
backend/
  app/
    main.py            # app, CORS, router includes
    config.py          # settings from env (pydantic-settings)
    deps.py            # get_current_user (JWT), get_supabase(user_jwt)
    models.py          # Pydantic request/response models
    routers/
      projects.py
      matches.py
      feed.py
      skills.py
      comments.py
      collab.py
      source.py        # upload, tree, file view, download
      research.py      # start run, read run, share report
      recommendations.py  # For you, dismiss, interests, idea suggestions
      graph.py
      tolken.py        # fund, release, cancel, balance
    services/
      matching.py      # scoring logic
      graph.py         # adjacency build, swap and ring detection, subgraph BFS
      tolken_service.py    # balance checks, status transitions
      source_service.py    # safe zip ingestion, signed URLs
      llm.py               # OpenAI-compatible client, llm_json with validation and one retry
      webresearch.py       # WebResearch interface, TinyFish implementation
      research_service.py  # research pipeline and citation checks
      recommend_service.py # For you scoring, idea suggestions
  fixtures/
    research_report.json   # stored sample report for RESEARCH_MODE=fixture
  scripts/
    seed.py            # skills, 10 profiles, 15-20 projects, needs, offers
  supabase/
    schema.sql         # tables, RLS, trigger
  requirements.txt
  .env.example
```

## Environment variables

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_KEY=     # seed script, plus writes to the Tolken ledger, source tables, and signed URLs after authorization
FRONTEND_ORIGIN=http://localhost:3000
SOURCE_MAX_ZIP_MB=25
SOURCE_MAX_FILES=1000
SOURCE_MAX_UNCOMPRESSED_MB=100
LLM_BASE_URL=https://openrouter.ai/api/v1   # Ollama, local dev only: http://localhost:11434/v1
LLM_API_KEY=                                 # OpenRouter key; any non-empty string for Ollama
LLM_MODEL=                                   # pick a model with reliable JSON output
TINYFISH_API_KEY=
RESEARCH_MODE=live                           # live or fixture
RESEARCH_MAX_QUERIES=6
RESEARCH_MAX_PAGES=8
RESEARCH_TIMEOUT_S=180
RESEARCH_RUNS_PER_DAY=3
```

## Schema (`supabase/schema.sql`)

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  -- Tolken is the in-app currency. There is no money anywhere in Nodal.
  tolken_balance int not null default 0 check (tolken_balance >= 0),
  interests text[] not null default '{}',
  created_at timestamptz default now()
);

create table skills (
  id serial primary key,
  name text not null,
  slug text unique not null,
  category text not null check (category in ('software','hardware','creative'))
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('software','hardware','creative')),
  title text not null,
  summary text not null,
  readme_md text,
  stage text not null default 'building' check (stage in ('idea','building','shipped')),
  cover_url text,
  repo_url text,
  demo_url text,
  source_access text not null default 'none' check (source_access in ('none','open')),
  source_zip_path text,
  source_size_bytes bigint,
  source_uploaded_at timestamptz,
  created_at timestamptz default now()
);

create table project_needs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  skill_id int not null references skills(id),
  note text,
  bounty_tolken int check (bounty_tolken is null or bounty_tolken > 0),
  status text not null default 'open' check (status in ('open','filled'))
);
create index on project_needs (skill_id, status);

create table profile_offers (
  profile_id uuid not null references profiles(id) on delete cascade,
  skill_id int not null references skills(id),
  level int not null check (level between 1 and 3),
  available boolean default true,
  primary key (profile_id, skill_id)
);
create index on profile_offers (skill_id);

create table project_tags (
  project_id uuid not null references projects(id) on delete cascade,
  tag text not null,
  primary key (project_id, tag)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table collab_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_profile_id uuid not null references profiles(id) on delete cascade,
  skill_id int not null references skills(id),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now()
);

create table source_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,
  size_bytes int not null,
  is_text boolean not null default false,
  unique (project_id, path)
);
create index on source_files (project_id);

-- source is always open, so file text can be read by everyone through FastAPI
create table source_contents (
  file_id uuid primary key references source_files(id) on delete cascade,
  content text not null
);

create table research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  status text not null default 'queued'
    check (status in ('queued','running','done','partial','failed')),
  steps jsonb not null default '[]',   -- [{at, label}], shown live in the UI
  report jsonb,
  sources jsonb,                       -- [{id, url, title}]
  model text,
  mode text not null default 'live',   -- live or fixture
  idea_hash text not null,             -- hash of title, summary, readme_md; drives the 24h cache
  is_public boolean not null default false,
  error text,
  created_at timestamptz default now(),
  finished_at timestamptz
);
create index on research_runs (project_id, created_at desc);

create table idea_suggestions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  pitch text not null,
  why_you text not null,
  skill_ids int[] not null default '{}',
  tags text[] not null default '{}',
  dismissed boolean not null default false,
  posted_project_id uuid references projects(id) on delete set null,
  created_at timestamptz default now()
);

create table recommendation_dismissals (
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (profile_id, project_id)
);

create table tolken_ledger (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  need_id uuid not null references project_needs(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  contributor_id uuid references profiles(id),
  amount_tolken int not null check (amount_tolken > 0),
  status text not null default 'pending_funding'
    check (status in ('pending_funding','funded','released','refunded','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on tolken_ledger (owner_id);
create index on tolken_ledger (contributor_id);

-- service-role only: move Tolken between balances when a bounty is funded, released, or refunded
create function increment_tolken(p_profile uuid, p_amount int) returns void as $$
  update profiles set tolken_balance = tolken_balance + p_amount where id = p_profile;
$$ language sql security definer;
revoke execute on function increment_tolken(uuid, int) from public, anon, authenticated;

-- trigger: create a profile row on signup
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, handle, display_name)
  values (new.id, split_part(new.email, '@', 1) || '-' || substr(new.id::text, 1, 4),
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
```

### RLS

Enable RLS on every table. Policies:

- `skills`, `projects`, `project_needs`, `project_tags`, `comments`, `profiles`, `profile_offers`: `select` for everyone.
- `projects`, `project_needs`, `project_tags`: insert/update/delete where the parent project's `owner_id = auth.uid()`.
- `comments`: insert where `author_id = auth.uid()`; delete where `author_id = auth.uid()`.
- `profile_offers`, `profiles`: write where `id` / `profile_id = auth.uid()`.
- `collab_requests`: insert where `from_profile_id = auth.uid()`; select/update where requester or project owner.
- `source_files`: select for everyone (source is open). No client writes.
- `source_contents`: select for everyone; writes only through FastAPI with the service role.
- `research_runs`: select where `is_public` is true or `requested_by = auth.uid()`. No client writes; FastAPI writes progress with the service role.
- `idea_suggestions`, `recommendation_dismissals`: select where `profile_id = auth.uid()`. Writes go through FastAPI.
- `tolken_ledger`: select where `owner_id = auth.uid()` or `contributor_id = auth.uid()`. No client writes; all writes go through FastAPI.

`repo_url` is public everywhere; source is never gated.

Storage buckets: `covers` (public read) and `source` (private, no policies; only FastAPI touches it, and only through 60-second signed URLs).

## Auth

- Frontend sends the Supabase access token: `Authorization: Bearer <jwt>`.
- `deps.get_current_user` verifies the JWT with `SUPABASE_JWT_SECRET` (HS256, audience `authenticated`) and returns `{id, jwt}`.
- `deps.get_supabase(user)` returns a Supabase client that carries the user's JWT, so RLS applies. Public GET endpoints may use the anon key.
- CORS: allow only `FRONTEND_ORIGIN`.

## Endpoints (`/api/v1`)

| Method and path | Auth | Purpose |
| --- | --- | --- |
| GET /projects | No | Filters: `type`, `stage`, `skill`, `tag`, `source` (`open`), `q`, `page` |
| POST /projects | Yes | Create project (with optional `needs` and `tags`) |
| GET /projects/{id} | No | Detail with needs, tags, comment count, `source_access`, `has_source` |
| PATCH /projects/{id} | Owner | Edit, including `stage`, `readme_md`, and `source_access` |
| POST /projects/{id}/needs | Owner | Add need `{skill_id, note}` |
| GET /projects/{id}/matches | No | Ranked people with `reasons` |
| GET /me/matches | Yes | Ranked projects needing what I offer |
| GET /me/cycles | Yes | Swaps and rings that include me |
| GET /graph/projects/{id} | No | Node graph around a project (`depth` 1 or 2, default 2) |
| PUT /me/offers | Yes | Replace my offers `[{skill_id, level}]` |
| PUT /me/interests | Yes | Replace my interest tags (up to 10) |
| GET /feed/intersections | No | Projects sharing tags across types |
| GET /skills | No | Taxonomy |
| GET /projects/{id}/comments | No | List comments |
| POST /projects/{id}/comments | Yes | Add comment |
| POST /projects/{id}/collab-requests | Yes | `{skill_id, message}` |
| GET /me/collab-requests | Yes | Incoming and outgoing |
| POST /collab-requests/{id}/respond | Owner | `{status: accepted or declined}`; accepting a request for a need with a Tolken bounty creates a `tolken_ledger` row |
| POST /projects/{id}/source | Owner | Upload a .zip (multipart); replaces any existing source |
| DELETE /projects/{id}/source | Owner | Remove the source |
| GET /projects/{id}/source/tree | No | File tree (path, size, is_text) |
| GET /projects/{id}/source/file | No | Query `path`; text content of one file |
| GET /projects/{id}/source/download | No | `{url}`: signed URL for the zip, valid 60 seconds |
| POST /projects/{id}/research | Owner of an idea | Start a market-research run, or return the cached one: `{id, status, cached}`. 409 if the project is not at stage `idea` |
| GET /research/{id} | Owner or public | Status, live steps, report, sources |
| GET /projects/{id}/research/latest | Owner or public | Latest report for the project |
| PATCH /research/{id} | Owner | `{is_public}`: show the report on the idea page |
| GET /me/recommendations | Yes | Ranked ideas and projects for me with `reasons`; query `stage`, `limit` |
| POST /me/recommendations/{project_id}/dismiss | Yes | Hide an item from my feed |
| POST /me/idea-suggestions/generate | Yes | LLM: 3 idea suggestions from my skills, interests, and platform gaps |
| GET /me/idea-suggestions | Yes | My suggestions |
| POST /me/idea-suggestions/{id}/post | Yes | Create an idea project from a suggestion |
| POST /me/idea-suggestions/{id}/dismiss | Yes | Discard a suggestion |
| GET /me/tolken | Yes | My balance and ledger entries |
| POST /projects/{id}/needs/{need_id}/fund | Owner | Fund a bounty in Tolken: `pending_funding` to `funded`, deducts from my balance. 409 if the balance is too low |
| POST /tolken/{id}/release | Owner | `funded` becomes `released`; credits the contributor's `tolken_balance` |
| POST /tolken/{id}/cancel | Owner | `funded` becomes `refunded` (Tolken returns to me), `pending_funding` becomes `cancelled`; blocked after release |
| GET /health | No | Liveness check |

Use Pydantic models for every request and response. Return consistent errors `{detail: string}`. FastAPI serves OpenAPI at `/docs`; the frontend generates types from `/openapi.json`.

## Matching (`services/matching.py`)

Join open `project_needs` to available `profile_offers` on `skill_id`, excluding the project owner.

```
score = 50 + 15*(level-1) + 20*[offerer has another offer in the project's category]
        + 5*min(shared_tags, 3) + 25*[reciprocal]
```

For "people for this project", `shared_tags` = overlap between the project's tags and the tags of the offerer's own projects. Return top 10, sorted by score descending, as:

```json
{
  "profile": {"id": "...", "handle": "...", "display_name": "..."},
  "skill": {"id": 1, "name": "ESP32 firmware"},
  "score": 85,
  "reasons": ["Matches need: ESP32 firmware", "Skill level 3", "Also offers hardware skills"]
}
```

`/me/matches` is the mirror: group by project, same score, `reasons` explain the match from the viewer's side.

## Graph matching (`services/graph.py`)

Derived at query time from `project_needs`, `profile_offers`, and `projects.owner_id`. No new tables.

**Graph:** directed, over profiles. Edge `u -> v` exists when u has an available offer for a skill that has an open need on a project owned by v. Label each edge `(skill_id, project_id)`. Build it with one join on `skill_id`, dropping self-edges (u == v). Hold it as `adj: dict[profile_id, dict[profile_id, list[Edge]]]`.

**Detection**

- **Swap (2-cycle):** for each edge u -> v, check `u in adj[v]`. Canonicalize by sorting the pair; dedupe.
- **Ring (3-cycle):** for each edge u -> v and each w in `adj[v]` with w not in {u, v}, check `u in adj[w]`. Canonicalize by rotating the tuple so the smallest id is first; dedupe.
- Cycle score = sum of its edge scores (same formula as above, with `reciprocal` true for swap edges). Return top 10 by score.
- Complexity is roughly O(edges times max out-degree). Fine for hundreds of profiles. Do not add longer cycles.

The `reciprocal` flag on `/projects/{id}/matches` is true when the matched person owns a project that the project's owner could fill (a swap exists between them).

**`GET /me/cycles`:** only cycles that include the current user.

```json
{
  "cycles": [
    {
      "kind": "ring",
      "score": 245,
      "members": [{"id": "...", "handle": "..."}],
      "links": [
        {"from": "profile_id", "to": "profile_id", "project_id": "...",
         "skill": {"id": 1, "name": "ESP32 firmware"}}
      ]
    }
  ]
}
```

**`GET /graph/projects/{id}?depth=2`:** subgraph for the node view. BFS from the project; depth counts "fills" hops.

- Depth 1: profiles who can fill the root project's open needs.
- Depth 2: for each of those profiles, the projects they own, and the profiles who can fill those projects' open needs.
- Cap at 40 nodes (keep the highest-scoring); reject `depth > 2`.

```json
{
  "root": "project_id",
  "nodes": [
    {"id": "...", "kind": "project", "label": "Plant Monitor", "type": "hardware"},
    {"id": "...", "kind": "profile", "label": "@maya"}
  ],
  "edges": [
    {"source": "profile_id", "target": "project_id", "kind": "fills",
     "skill": "ESP32 firmware", "cycle_ids": ["c1"]},
    {"source": "profile_id", "target": "project_id", "kind": "owns", "cycle_ids": []}
  ],
  "cycles": [{"id": "c1", "kind": "ring", "member_ids": ["...", "...", "..."]}]
}
```

`cycle_ids` on an edge lists the cycles that edge belongs to, so the frontend can highlight them.

## Intersections feed

Return projects that share at least one tag with a project of a different `type`. Include `shared_tags` and `other_type` on each item. Order by number of shared tags, then recency.

## LLM client and web research (`services/llm.py`, `services/webresearch.py`)

**LLM:** use the `openai` SDK with `base_url=LLM_BASE_URL`, `api_key=LLM_API_KEY`, and `model=LLM_MODEL`. OpenRouter and Ollama both expose an OpenAI-compatible chat endpoint, so one client covers both. Use OpenRouter for anything deployed. Use Ollama (`http://localhost:11434/v1`) for local development only, because a cloud-hosted backend cannot reach a developer machine. Wrap it as `llm_json(messages, schema: type[BaseModel]) -> BaseModel`: ask for JSON only, parse it, validate with Pydantic; on failure retry once with the validation error appended, then raise `LLMError`. Timeout 60 seconds per call. Never log keys.

**Web:** a `WebResearch` interface with `search(query, max_results) -> list[{title, url, snippet}]` and `fetch(urls) -> dict[url, markdown]`. Implement `TinyFishWebResearch` against TinyFish's search and fetch APIs (`TINYFISH_API_KEY`). TinyFish search supports `include_domains`, `exclude_domains`, `domain_type` (web, news, research_paper), `after_date`, `location`, `language`, and `page`. Fetch takes up to 10 URLs per call, returns markdown, and has `per_url_timeout_ms` (use 20000). Check TinyFish's docs for the exact request shapes. Exclude low-signal domains in search (for example `pinterest.com` and `quora.com`). Truncate each fetched page to about 8,000 characters before it goes to the LLM. TinyFish also offers a deep-research mode; this build uses search and fetch so progress can stream and every claim can be citation-checked.

## Research agent (`routers/research.py`, `services/research_service.py`)

Runs as a FastAPI background task that writes progress to `research_runs`.

**Start (`POST /projects/{id}/research`):** owner only, and the project must be at `stage = 'idea'` (409 otherwise). Compute `idea_hash` from title, summary, and `readme_md`. If a `done` run with the same hash exists from the last 24 hours, return it with `cached: true`. Otherwise enforce `RESEARCH_RUNS_PER_DAY` per user (429 with `{detail: ...}`), insert a `queued` run, start the background task, and return `{id, status}`. In `RESEARCH_MODE=fixture`, skip the pipeline: write `fixtures/research_report.json` as the report, append canned steps with short delays (so the UI still shows progress), set `mode = 'fixture'`, and mark the run `done`.

**Pipeline:** each step appends `{at, label}` to `steps`. A total timeout of `RESEARCH_TIMEOUT_S` applies; after it the run saves what it has as `partial`.

1. **Plan:** `llm_json` returns up to `RESEARCH_MAX_QUERIES` queries, each tagged with an angle: `competitors`, `problem_evidence`, `market_size`, `pricing`, or `risks`. Label: "Planning searches".
2. **Search:** run the queries in parallel with `WebResearch.search` (5 results each). Dedupe by domain. Labels: `Searching: <query>`.
3. **Read:** pick up to `RESEARCH_MAX_PAGES` URLs, favoring variety across angles, and fetch them in one or two calls. Labels: `Reading: <domain>`. Skip pages that fail.
4. **Extract:** one LLM call per page returns up to 5 facts `{type, claim, quote}`, where `type` is `competitor`, `demand`, `market_size`, `pricing`, or `risk` and `quote` is a supporting phrase of at most 25 words. Give each fact an id (`f1`, `f2`, ...) and keep its source `{id, url, title}`. Label: "Extracting facts".
5. **Synthesize:** one LLM call gets the idea and the fact list (never raw pages) and returns the report below, citing fact ids only. Label: "Writing report".
6. **Check:** drop any item whose `fact_ids` are empty or unknown. If fewer than 3 distinct sources remain, or no `demand` fact is cited, force `verdict` to `not_enough_evidence`. Set `confidence` to `low` when there are fewer than 5 sources. Save `report`, `sources`, `model`, and `finished_at`, and set status `done`.

On an unrecoverable error set `failed` with a short `error`. On timeout with at least one extracted fact, set `partial`.

**Report schema:**

```json
{
  "verdict": "promising | mixed | weak | not_enough_evidence",
  "confidence": "low | medium | high",
  "summary": "2 to 3 sentences",
  "competitors": [{"name": "...", "what": "...", "fact_ids": ["f1"]}],
  "demand_signals": [{"text": "...", "fact_ids": ["f2"]}],
  "market_size": [{"text": "...", "fact_ids": ["f3"]}],
  "business_models": [{"text": "...", "fact_ids": ["f4"]}],
  "risks": [{"text": "...", "fact_ids": ["f5"]}],
  "next_steps": ["3 to 5 short, concrete actions"]
}
```

`next_steps` is the only field that may be uncited. The prompt must say: use only the facts provided; say so when the facts do not cover something; never invent numbers, company names, or URLs.

**Prompt injection:** fetched pages and search snippets are untrusted. Put them only inside clearly delimited data blocks, tell the model to ignore any instructions inside them, give it no tools, and validate its JSON. Never follow links found in pages. The UI renders all report text as plain text.

**Read endpoints:** `GET /research/{id}` and `GET /projects/{id}/research/latest` return `{id, status, steps, report, sources, model, mode, is_public, created_at}` plus `is_sample: true` when `mode = 'fixture'`. Only the owner can read a run unless `is_public` is true. `PATCH /research/{id}` toggles `is_public` (owner only).

### Cool factor check

The poster chooses which checks to run: `POST /projects/{id}/research` takes `{checks: ['market', 'cool']}` (either, both; an empty list is rejected with 422, and posting with no checks simply skips this endpoint). `research_runs` gains `checks text[] not null default '{market}'` and `cool jsonb`. Rate limits and caching apply per check set.

Cool factor is a smaller pipeline than the market check:

1. **Look around:** one TinyFish search for existing projects like this (`"<title> <summary> project"`), keeping the top 5 titles and snippets as comparison data.
2. **Score:** one `llm_json` call gets the idea, the README, and the comparison snippets and returns the object below. The prompt defines each measure and says to ignore money and market size.
3. **Check:** clamp every score to 1 to 10, compute `overall` as the mean rounded to one decimal, and drop the result if any `reason` is empty.

```json
{
  "overall": 8.0,
  "measures": [
    {"key": "novelty", "score": 8, "reason": "One short sentence"},
    {"key": "demo_appeal", "score": 9, "reason": "..."},
    {"key": "fun_to_build", "score": 8, "reason": "..."},
    {"key": "scope", "score": 7, "reason": "Weekend-sized scope scores higher"}
  ],
  "why": "One or two sentences on what makes it cool and the main risk"
}
```

When both checks are requested, run them in parallel and write each result as it finishes so the page can show one while the other loads. In fixture mode return a stored cool-factor object next to the stored market report. The UI labels the score an AI score, not a fact.

## Recommendations (`routers/recommendations.py`, `services/recommend_service.py`)

**For you (`GET /me/recommendations?stage=idea|building|any&limit=20`):** candidates are projects with at least one open need, excluding the caller's own projects, ones they already have a collab request on, and ones in `recommendation_dismissals`. Reuse the matching join (needs against the caller's available offers) so skill fit is computed once. Score:

```
score = 50*[fills a skill I offer] + 10*(level-1) + 5*min(shared_tags, 3)
        + 15*[type differs from my own projects] + 10*max(0, 1 - age_days/30) + 25*[swap exists]
```

`shared_tags` counts overlap with `profiles.interests` and the tags of the caller's own projects. Candidates that fill no offered skill may still appear when they share tags, but cannot outrank skill-fit items. Return the top `limit` sorted by score, each with `reasons` (for example "Needs ESP32 firmware, which you offer at level 3", "Shares tag sensor-data", "Different from what you usually build"). Default `stage` is `any`.

**Dismiss (`POST /me/recommendations/{project_id}/dismiss`):** insert into `recommendation_dismissals`.

**Interests (`PUT /me/interests`):** replace `profiles.interests` (up to 10 short tags).

**Idea suggestions (optional, LLM):** `POST /me/idea-suggestions/generate` builds a prompt from the caller's offers and interests, the 10 most common open needs, and the 10 trending tags. `llm_json` returns exactly 3 suggestions `{title, pitch, why_you, skill_ids, tags}`. Drop any `skill_id` not in `skills`. Store them in `idea_suggestions`. Limit 5 generations per user per day. `POST /me/idea-suggestions/{id}/post` creates a project with `stage = 'idea'`, the suggestion's title, its pitch as `summary`, a `readme_md` built from the pitch and why-you, its tags, and needs from `skill_ids`, then sets `posted_project_id`. `POST /me/idea-suggestions/{id}/dismiss` sets `dismissed`. Suggestions are starting points; never claim they have proven demand.

## Social layer (`routers/feed.py`, `routers/profiles.py`, `routers/inbox.py`, `routers/team.py`)

The app is a social surface over the same data. Everything here is derived from existing tables plus a few new ones.

**New tables (add to `schema.sql`)**

```sql
create table project_stars (
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (profile_id, project_id)
);

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'contributor' check (role in ('owner','contributor')),
  skill_id int references skills(id),
  share_bps int check (share_bps between 0 and 10000),   -- 4000 = 40%
  status text not null default 'invited' check (status in ('invited','joined')),
  created_at timestamptz default now(),
  primary key (project_id, profile_id)
);

create table cycle_invites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id),
  kind text not null check (kind in ('swap','ring')),
  links jsonb not null,                -- same shape as /me/cycles links
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now()
);
create table cycle_invite_members (
  invite_id uuid not null references cycle_invites(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','accepted','declined')),
  primary key (invite_id, profile_id)
);

```

RLS: `project_stars` and `follows` are readable by everyone and writable where the actor is the row's profile. `project_members` is readable by everyone and written by FastAPI only. `cycle_invites` and `cycle_invite_members` are readable by participants and written through FastAPI.

**Endpoints**

| Method and path | Auth | Purpose |
| --- | --- | --- |
| GET /feed?tab=for_you or following or ideas&cursor= | Yes | Posts for the Home feed. `for_you` uses the recommendation score, `following` is projects by people I follow plus ones I starred, `ideas` is `stage = idea`. Each post has cover info, owner, needs, star and comment counts, `people_fit` count, check badges for ideas (market verdict, cool score), and `viewer_starred` |
| GET /feed/stories | Yes | Up to 10 people who share a swap or ring with me (from the graph service) first, then people I follow. Each has `{profile, tag: 'swap' or 'ring' or null}` |
| POST /projects/{id}/star, DELETE /projects/{id}/star | Yes | Toggle a star |
| POST /profiles/{id}/follow, DELETE /profiles/{id}/follow | Yes | Toggle a follow |
| GET /profiles/{handle} | No | Profile with offers, interests, stats (projects, stars received, collaborations, followers), pinned projects, swaps and rings summary (own profile only) |
| GET /profiles/{handle}/activity?weeks=52 | No | Daily counts for the heatmap: posts, comments, collab requests, source uploads, and accepted collaborations, summed per day. Return `{date, count}` for days with activity only |
| GET /me/inbox | Yes | Requests: collab requests, swap invites, and ring invites in one list, newest first, each with `kind`, people involved, links, and my available actions |
| POST /cycles/invite | Yes | Create a swap or ring invite from a cycle I am in: `{cycle_links}`. Creates `cycle_invites` and member rows (my response is accepted) |
| POST /cycle-invites/{id}/respond | Yes | `{response: accepted or declined}`. When every member has accepted, set `status` to accepted and create `project_members` rows (status joined, role contributor, skill from the link) on each project that has a need filled |
| GET /projects/{id}/team | Yes (member) | Members with role, skill, `share_bps`, and status, plus the sum of shares |
| PATCH /projects/{id}/team/{profile_id} | Owner | `{share_bps}`. Reject with 422 if the new total would exceed 10000 |

**Cover art:** the API returns `cover_url` or, when it is null, a deterministic `cover` object `{pattern, tint}` derived from a hash of the project id and its type (patterns: rings, bars, blocks, stripes, dots). The frontend draws it with CSS, so no image generation is needed.

**Tolken shares:** a released bounty splits by member shares: each joined member gets `floor(amount * share_bps / 10000)` and the rounding remainder goes to the owner. Shares must total 10000 before a bounty is funded. There is no money anywhere in this flow.

**Heatmap counts:** compute with one query per source table grouped by `date_trunc('day', created_at)` and merge in Python. Cache for 5 minutes per handle.

## Source code (`routers/source.py`, `services/source_service.py`)

Owners upload a project's source as a .zip. `projects.source_access` is `none` or `open`.

- `none`: no source (an idea or link-only project).
- `open`: anyone can browse and download, no login needed. There is no closed or paid mode.

**Access rule:** source is never gated. Every source endpoint serves open projects to everyone and returns 404 when there is no source.

**Upload (`POST /projects/{id}/source`):** owner only; `source_access` must be `open`. Multipart form with one `file`. Process it synchronously:

1. Reject if the zip is over `SOURCE_MAX_ZIP_MB`, has more than `SOURCE_MAX_FILES` entries, or would expand past `SOURCE_MAX_UNCOMPRESSED_MB`. Check declared sizes first, and also stop if the bytes actually read exceed the limit.
2. Reject any entry with an absolute path, a `..` segment, a backslash, or a symlink type (zip slip). Normalize paths to forward slashes.
3. If every entry shares one top-level folder, strip it.
4. Skip and count entries under `.git/`, `node_modules/`, `__pycache__/`, `.venv/`, and any file named `.env` or `.env.*`. Return the skipped count so the UI can say "Skipped 214 files (dependencies and secrets)".
5. For each remaining file, write a `source_files` row. If it is under 200 KB and decodes as UTF-8, set `is_text` and write the text to `source_contents`. Keep at most 5 MB of text per project; files past that are listed but not viewable.
6. Upload the original zip to the private `source` bucket at `{project_id}/source.zip` and set `source_zip_path`, `source_size_bytes`, and `source_uploaded_at`.

Return `{file_count, skipped_count}`. A re-upload deletes the old rows and zip first. Never execute, import, or render anything from the zip. Rate limit uploads to 5 per hour per user.

**Tree (`GET /projects/{id}/source/tree`):** `{"files": [{"path", "size_bytes", "is_text"}]}` sorted by path.

**File (`GET /projects/{id}/source/file?path=...`):** return `{path, size_bytes, content}` for text files and `{path, size_bytes, binary: true}` otherwise. Return 404 when the path does not exist.

**Download (`GET /projects/{id}/source/download`):** create a signed URL for the zip, valid 60 seconds, with the service-role client and return `{url}`. Never return the storage path.

**Delete (`DELETE /projects/{id}/source`):** owner only; removes rows, zip, and resets `source_zip_path`.

## Tolken (`routers/tolken.py`, `services/tolken_service.py`)

Tolken (`◈`) is the in-app currency. There is no money, no provider, and no checkout: funding moves Tolken between two balances and the server records every movement in `tolken_ledger`. Authorize the caller in code first; then use a service-role client for ledger writes and `increment_tolken`.

**Accepting a request:** in `POST /collab-requests/{id}/respond`, on `accepted`, look up the project's need for that `skill_id`. If it has `bounty_tolken`, insert a `tolken_ledger` row (`pending_funding`, amount = bounty, owner and contributor ids).

**Fund (`POST /projects/{id}/needs/{need_id}/fund`):** owner only; status must be `pending_funding` and shares must total 10000. Reject with 409 when `tolken_balance < amount_tolken`. Deduct the amount from the owner and set status to `funded` in one transaction.

**Release (`POST /tolken/{id}/release`):** owner only; status must be `funded`, else 409. Set status to `released`, then credit the contributor (and split by member shares) with `increment_tolken`. A second release returns 409 and must not credit twice, so do the status change and the credits in one transaction or check the status in the update's `where` clause.

**Cancel (`POST /tolken/{id}/cancel`):** owner only. `pending_funding` becomes `cancelled`; `funded` becomes `refunded` and returns the Tolken to the owner; `released` returns 409.

**Balance (`GET /me/tolken`):** return `{balance, ledger: [{project_id, need_id, amount_tolken, status}]}` for the caller.

**Transitions:** enforce them in one function (`pending_funding` to `funded` or `cancelled`; `funded` to `released` or `refunded`; nothing else). Return `{detail: string}` on an invalid change.

## Rate limiting

`slowapi`: 10 per minute per user on comments and collab requests.

## Seed script (`scripts/seed.py`)

Uses the service key. Idempotent (upsert by slug or handle).

- About 60 skills across software, hardware, creative (include "ESP32 firmware", "PCB design", "sound design", "3D modeling", "game dev", "UI design", "Python backend", "generative art")
- 10 profiles with offers
- 15 to 20 projects mixed across types with needs and tags; include the demo pair: a hardware plant monitor needing firmware, and a generative art piece using sensor data that shares the `sensor-data` tag
- One 3-way ring: A's hardware project needs ESP32 firmware (B offers it); B's game needs sound design (C offers it); C's art piece needs 3D modeling (A offers it)
- One swap: D's project needs UI design (E offers it) and E's project needs Python backend (D offers it)
- One bounty: the plant monitor's firmware need has `bounty_tolken = 50`
- Source: attach small sample zips to three projects through the same ingestion function; all three are open source
- Ideas: three projects at `stage = 'idea'` with READMEs, tags, and needs. One is the demo idea for the research report; `fixtures/research_report.json` is its report, uses placeholder `example.com` sources, and is labeled as a sample
- Interests: give each seeded profile 2 to 4 interest tags

## Definition of done

1. `uvicorn app.main:app --reload` runs and `/docs` lists every endpoint above.
2. A logged-in user can create a project, add a need, and see ranked matches from seeded data.
3. RLS verified with a second account (cannot edit another user's project).
4. `seed.py` can be rerun without duplicates.
5. `/me/cycles` returns the seeded ring for user A and the seeded swap for user D; `/graph/projects/{id}` marks both with `cycle_ids`.
6. An owner can fund a bounty in Tolken and release it; the balance drops, then the contributor's `/me/tolken` balance goes up by the bounty. A second release returns 409 and does not credit again. Funding with too low a balance returns 409.
7. Source: a zip uploaded as open source can be browsed and downloaded by a logged-out visitor. A zip containing `../` paths is rejected.
8. Social: `GET /feed?tab=for_you` returns posts with counts and check badges (idea posts only); `/feed/stories` lists the seeded swap and ring partners first; starring and following toggle and change the counts; `/profiles/{handle}/activity` returns heatmap days; accepting a ring invite from all three members creates `project_members` rows; funding is blocked unless shares total 10000.
9. Research: with `RESEARCH_MODE=live`, an idea's owner starts a run and sees steps stream in; the finished report cites sources for every item and forces `not_enough_evidence` when fewer than 3 sources were found. With `RESEARCH_MODE=fixture`, the same flow returns the stored report marked as a sample. A second run within 24 hours on unchanged text returns the cached run; a fourth run in a day returns 429.
10. Recommendations: `/me/recommendations` returns ranked items with reasons, excludes own and dismissed projects, and ranks a skill-fit idea above a tag-only one.

## Build order

1. Schema, RLS, trigger, seed skills
2. `deps.py` plus one protected endpoint (`/me/offers`) to prove the JWT path
3. Projects CRUD and needs
4. Matching service and both match endpoints
5. Graph service: adjacency, swap and ring detection, `/me/cycles`, `/graph/projects/{id}`
6. Comments, collab requests
7. Tolken: fund, release, cancel, balance
8. Source: zip ingestion, tree, file, download
9. LLM client, TinyFish wrapper, research pipeline with fixture mode (ideas only)
10. Recommendations: For you, dismiss, interests
11. Social layer: stars, follows, `/feed`, `/feed/stories`, profiles and heatmap, inbox, cycle invites
12. Team shares, Tolken split; cool factor check
13. Intersections feed, rate limiting, idea suggestions, polish
