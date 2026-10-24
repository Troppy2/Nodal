# Nodal backend

```
python -m venv .venv
.venv\Scripts\activate        # Windows (source .venv/bin/activate elsewhere)
pip install -r requirements.txt
copy .env.example .env        # fill in Supabase values
uvicorn app.main:app --reload # http://localhost:8000/docs
pytest
```

Database setup, once per Supabase project:

- Local: `npx supabase start` applies `supabase/migrations/` for you.
- Hosted: paste each file in `supabase/migrations/` (in name order) into the SQL editor and run it,
  or `npx supabase link --project-ref <ref>` then `npx supabase db push`.

Then load demo data: `python -m scripts.seed` (frontend catalog plus 100 generated profiles; safe to re-run).

Auth: user tokens are verified against the project's JWKS (`/auth/v1/.well-known/jwks.json`), so
`SUPABASE_JWT_SECRET` can stay empty unless the project still signs with the legacy HS256 secret.
