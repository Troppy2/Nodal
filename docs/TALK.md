# Talk outline

Three parts, about 5 minutes. Three beats in the demo. People remember threes.

- **Part 1:** the problem and the prompt. *Why Nodal exists.*
- **Part 2:** the graph. *How Nodal works.*
- **Part 3:** the live demo: **Intersect → Connect → Collaborate**. *Watch it work.*

Click-by-click: [DEMO.md](DEMO.md). Which features go in and why: [DEMO_GUIDE.md](DEMO_GUIDE.md).
Scoring numbers come from `backend/app/services/matching.py`.

## 1. Introduction, problem, and the prompt (~45 s)

- **Hook (slide 2):** "Let's be honest: the job market is f*****." Pause. "So stop waiting to be hired. Find the people who need your skills, and build with them."
- **Who:** "I'm Inah James, and this is Nodal."
- **Problem 1:** you can't find people with the skills your project is missing.
- **Problem 2:** you don't know if the idea is worth building.
- **Prompt:** "Today's prompt is Connect & Intersect, and Nodal does exactly that. You post an idea with the skills you **need**. Nodal researches it and finds the people who fit."
- **The hook:** "Nodal looks for trades. If you need sound design and the sound designer needs your hardware skills, that's a swap. With three people, it's a ring. Nobody has to hire anyone."
- **Tolken:** "When work does need a reward, owners post bounties in **Tolken**, our in-app currency. Yes, that's a South Park reference."
- **Handoff:** "Let me show you how it works under the hood."

Watch for: say "need", not "have". Say "Tolken", not "tokens". Don't say "invest". Pause before "that's a swap".

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
  - Cycles are ranked by score; the best show up on the project graph and under "Trades for you" on the Requests page.
- **The rest of the system, one line each:**
  - The research agent plans searches, reads pages, and writes a report where every claim cites a source.
  - The Tolken ledger takes a bounty from funded to paid, and the database won't let a balance go negative.
  - A cached "world" makes reads fast, and every write refreshes it instantly.
- **Stack:** FastAPI + Supabase Postgres on the backend, Next.js + React on the frontend.
- **Handoff:** "Now let's watch it."

## 3. Live demo: Intersect → Connect → Collaborate (~3 min)

- **Intersect** (DEMO steps 1–3):
  - Home, "People to build with": "Before I post anything, Nodal shows who my skills intersect with."
  - Post Singing Plant and let the research agent check it.
- **Connect** (DEMO steps 4–6):
  - The graph shows Rin with a Swap badge. "She fills our need, and we can fill hers."
  - Invite her; the invite arrives as a DM.
  - In Rin's window: Needs you, then accept the invite in Messages.
- **Collaborate** (DEMO steps 7–10):
  - Fund ◈ 50, Rin submits her work, Maya confirms.
  - End on Rin's profile showing her completed task and the Tolken payment.
- **Close:** "Nodal finds the people your project is missing, and the trades where helping each other costs nothing. Thank you."

## Slide deck

Five slides: title, the three parts above, closing. Give Claude this file plus `DEMO_GUIDE.md` and `DEMO.md`.
