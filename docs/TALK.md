# Talk outline

Three parts. Scoring numbers come from `backend/app/services/matching.py`.
Click-by-click demo: [DEMO.md](DEMO.md). Feature choices: [DEMO_GUIDE.md](DEMO_GUIDE.md).

## 1. Introduction, problem, and the prompt (~45 s)

- **Who:** "I'm Inah James, and this is Nodal."
- **Problem 1:** you can't find people with the skills your project is missing.
- **Problem 2:** you don't know if the idea is worth building.
- **Prompt:** "Today's prompt is Connect & Intersect. Nodal connects people, ideas, and skills, and finds where they meet."
- **The hook:** Nodal finds trades. A swap is two people filling each other's gaps; a ring is three. Nobody has to hire anyone.
- **Tolken:** bounties in Tolken, the in-app currency, with no real money. Then the South Park line.
- **Handoff:** "Let me show you how it works under the hood."

## 2. Technical complexity: the graph and how we measure closeness (~60 s)

- **The graph:** people and projects are nodes. An edge means "this person can fill this project's need."
- **How we score closeness:** each edge starts at 50 and adds:
  - **Skill level:** +15 per level above 1.
  - **Category fit:** +20 if they also offer other skills in that discipline (software, hardware, creative).
  - **Shared interests:** +5 per shared tag, up to 3.
  - **Two-way match:** +25 if the project owner can help them back. This bonus is what makes swaps rank first.
- **Cycle detection:**
  - Swaps are 2-person loops: I help you, you help me.
  - Rings are 3-person loops: A helps B, B helps C, C helps A.
  - Cycles are ranked by score; the best show up on the graph and on the Requests page.
- **The rest of the system, one line each:**
  - The research agent plans searches, reads pages, and writes a report where every claim cites a source.
  - The Tolken ledger takes a bounty from funded to paid, and the database won't let a balance go negative.
  - A cached "world" makes reads fast, and every write refreshes it instantly.
- **Stack:** FastAPI + Supabase Postgres on the backend, Next.js + React on the frontend.

## 3. Live demo: intersections and connecting people (~3 min)

Make each moment land on one of three beats:

- **Intersect:** the Intersections tab. "A creative map and a parking app both care about campus. Nodal found that overlap."
- **Connect:**
  - Post Singing Plant and watch the research run.
  - The graph shows Rin with a Swap badge. Invite her, and the invite arrives as a DM.
  - In Rin's window: Needs you, then accept the invite.
- **Collaborate:**
  - Fund ◈ 50, Rin submits her work, Maya confirms.
  - End on Rin's profile showing her completed task and the Tolken payment.
- **Close:** "Nodal finds the people your project is missing, and the trades where helping each other costs nothing."

## Slide deck (8 am)

Give Claude this file plus `DEMO_GUIDE.md` and `DEMO.md`. Five slides: title, the three parts above, closing.
