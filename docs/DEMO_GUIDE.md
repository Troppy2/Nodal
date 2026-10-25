# Demo guide: what to show and why

Prompt: **Connect & Intersect**. Build something that connects people, ideas, or tools, and explore
what happens where they intersect. Judging: innovation, technical complexity, design and usability,
presentation.

The talk is [TALK.md](TALK.md). The click-by-click script is [DEMO.md](DEMO.md). This page decides
**which features go in**, grouped by the same three beats as the talk.

## One-line pitch

> Nodal finds the people your project is missing, and the trades where helping each other costs nothing.

## Features to show

### Intersect: where projects and ideas meet

| Feature | Where | Criterion | Say this |
|---|---|---|---|
| **People to build with** | Home → For you, top row | Innovation, prompt fit | "Before I post anything, Nodal shows who my skills intersect with: swaps and rings, labelled." |
| **Post an idea with needs** | Create | Usability | "Say what you're making and which skills you need. That's all matching needs." |
| **Research agent** | Results → Market check, Cool factor | Technical complexity | "An agent plans searches, reads pages, extracts facts and writes a report where every claim cites a source." |

### Connect: the right people, both directions

| Feature | Where | Criterion | Say this |
|---|---|---|---|
| **People graph with swaps** | Results → graph | Innovation, technical complexity | "Rin fills our need, and we can fill one of hers. Nodal finds these loops on the skill graph, including three-way rings." |
| **Invite is a DM** | Invite to build → Messages | Design | "No separate notification system. The invite is a message, and the follow-up happens in the same thread." |
| **Needs you** | Rin: Home → Needs you | Prompt fit | "The same match from the helper's side: projects that need what I offer." |

### Collaborate: from invite to finished work

| Feature | Where | Criterion | Say this |
|---|---|---|---|
| **Tolken bounty** | Project → Needs → Fund, Submit, Confirm | Technical complexity, design | "An in-app currency, no money. Held when funded, paid when the owner confirms." |
| **Profile payoff** | Rin → Profile, and the Tolken balance in the sidebar | Design | "Proof of work: a completed task on her contribution graph, and Tolken earned." |

## Show only if asked

- **Trades for you** (Requests): suggested swaps and rings, each saying what you give and what you get.
- **Custom swap** (Requests → + Custom Swap): search for a person, pick your project and theirs; Nodal picks the skill each side offers best.
- **My Projects** page.
- **Explore** search and filters.
- **Source browser** on seeded projects that have code.

## Leave out

| Feature | Why |
|---|---|
| Alerts page | A second notification path; it competes with "invites are DMs". |
| Idea suggestions | Backend only, no screen. |
| Name-only sign-in details | Fine for a demo; don't invite security questions. |

## Technical talking points (for Q&A)

- **Matching:** each person–need edge scores 50, +15 per skill level above 1, +20 for category fit, +5 per shared tag (up to 3), +25 if the match goes both ways.
- **Cycles:** swaps are 2-person loops and rings are 3-person loops on the "can help" graph, ranked by score.
- **Research agent:** plan queries → search → read pages in parallel → extract facts → write a report with citations → score cool factor. Runs live, or from a fixture when offline.
- **Stack:** FastAPI + Supabase (Postgres, Auth, RLS), Next.js 15 + React 19. An in-memory "world" cache is rebuilt after every write, so reads are fast and always fresh.
- **Tolken ledger:** pending → funded → released, with database checks so balances can't go negative.

## Roles on stage

- **Driver A** runs Maya's window (DEMO steps 1–5, 7, 9).
- **Driver B** runs Rin's window (DEMO steps 6, 8, 10).
- **Speaker** narrates from [TALK.md](TALK.md) and the "Say this" column, and handles Q&A.
