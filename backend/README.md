# Nodal backend

```
python -m venv .venv
.venv\Scripts\activate        # Windows (source .venv/bin/activate elsewhere)
pip install -r requirements.txt
copy .env.example .env        # fill in Supabase values
uvicorn app.main:app --reload # http://localhost:8000/docs
pytest
```

Run `supabase/schema.sql` in the Supabase SQL editor first.
