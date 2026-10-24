# Nodal backend

Full local setup for the whole app (Supabase, this API, and the Next.js frontend): **[../docs/RUNNING.md](../docs/RUNNING.md)**.

```
python -m venv .venv
.venv\Scripts\activate        # Windows (source .venv/bin/activate elsewhere)
pip install -r requirements.txt
copy .env.example .env        # fill in Supabase values
uvicorn app.main:app --reload --port 8010 # http://localhost:8010/docs
pytest
```

Database setup, once per Supabase project:

- Local: `npx supabase start` applies `supabase/migrations/` for you.
- Hosted: paste each file in `supabase/migrations/` (in name order) into the SQL editor and run it,
  or `npx supabase link --project-ref <ref>` then `npx supabase db push`.

Then load demo data: `python -m scripts.seed` (frontend catalog plus 100 generated profiles; safe to re-run).

Auth: user tokens are verified against the project's JWKS (`/auth/v1/.well-known/jwks.json`), so
`SUPABASE_JWT_SECRET` can stay empty unless the project still signs with the legacy HS256 secret.

## How reads stay fast

Every Supabase query is a network round trip (~100-150 ms to the hosted project), so the backend keeps
round trips off the hot paths:

- `app/world.py` holds every public row discovery needs (projects, needs, offers, tags, stars, follows,
  members, profiles, skills) in memory. Feed, cards, profiles, graph, matches, stories and
  recommendations read only from it. It reloads with all its queries in parallel (~0.2-0.3 s) after
  any POST/PUT/PATCH/DELETE (`InvalidateOnWrite` in `main.py`), and at least every 20 s.
- Private and transactional data (Tolken, team shares, inbox, research reports, `/me`) is always read
  live, and writes check ownership against the live row.
- `app/db.py` shares one HTTP connection pool across all clients and has `parallel(...)` for
  independent queries.

If you write to the database outside the API (SQL editor, seed script) while the server runs, changes
show up within 20 s. Run one server process for the demo: each process keeps its own world.
