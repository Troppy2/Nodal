# Nodal
Social Hack 2026 by Social Coding Club!

## Run it locally

Backend, frontend, and local Supabase — env values, seeding, and troubleshooting: **[docs/RUNNING.md](docs/RUNNING.md)**.

Short version:

```bash
# backend/ — once
npx supabase start
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed

# terminal 1 (backend/)
uvicorn app.main:app --reload --port 8010

# terminal 2 (frontend/)
npm install && npm run dev
```

Then open http://localhost:3000 and sign in with a name.

# Nodal: find the people your project is missing

Most side projects stall because one skill is missing. A hardware maker can't write firmware, a game developer has no sound designer, and an artist has no one to build the electronics. Nodal connects those people.

## How it works

1. **Post a project or an idea.** It can be software, hardware or creative work. You list what it needs, such as "ESP32 firmware" or "sound design".
2. **Say what you can do.** Your profile lists the skills you offer and how good you are at each.
3. **Nodal matches you.** Every project shows who can fill each of its needs. Every person sees which projects need what they offer.
4. **Trades get spotted for you.** If you can help someone's project and they can help yours, Nodal flags it as a **swap**. It also finds **3-way rings**: you help Dev, Dev helps Rin, Rin helps you. Nobody has to find each other by luck.
5. **Team up.** Send a request, accept it, and start building together.

## Other features

- **Idea checks:** an AI agent searches the web and writes a report, with sources, on whether your idea could be a business. A separate "cool factor" score rates how fun and demo-able it is.
- **Bounties in Tolken:** offer an in-app currency bounty for a need and release it when the work is done. There is no real money, checkout, or payout.
- **A familiar feed:** posts, likes, follows and a profile page, in the style of Instagram, with GitHub-style project pages underneath.

> **The idea in one line:** projects are dots, the skills that connect them are lines, and Nodal draws the lines.
