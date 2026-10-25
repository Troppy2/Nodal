# Demo guide: what to show and why

Prompt: **Connect & Intersect**. Build something that connects people, ideas, or tools, and explore
what happens where they intersect. Judging: innovation, technical complexity, design and usability,
presentation.

The click-by-click script is [DEMO.md](DEMO.md). This page decides **which features go in** and what
to say about each.

## One-line pitch

> Nodal finds the people your project is missing, and the trades where helping each other costs nothing.

## Features to show (in order)

| # | Feature | Where | Criterion it scores | Say this |
|---|---|---|---|---|
| 1 | **Intersections feed** | Home → Intersections | Innovation, prompt fit | "Projects from different worlds working on the same thing. A creative map and a parking app both care about campus. Nodal finds that overlap." |
| 2 | **Post an idea with needs** | Create | Usability | "Say what you're making and which skills you're missing. That's the only input matching needs." |
| 3 | **Research agent** | Results → Market check, Cool factor | Technical complexity | "An agent plans searches, reads pages, extracts facts and writes a report where every claim cites a source." |
| 4 | **People graph with swaps** | Results → graph | Innovation, technical complexity | "Rin fills our need, and we can fill one of hers. Nodal finds these cycles on the skill graph, including three-way rings." |
| 5 | **Invite is a DM** | Invite to build → Inbox | Design | "No separate notification system. The invite is a message, and the follow-up happens in the same thread." |
| 6 | **Needs you** | Rin: Home → Needs you | Prompt fit (both directions) | "The same match from the helper's side: projects that need what I offer." |
| 7 | **Tolken bounty** | Needs → Fund, Submit, Confirm | Technical complexity, design | "An in-app currency, no money. Held when funded, paid when the owner confirms, and it counts on the helper's contribution graph." |
| 8 | **Profile payoff** | Rin → Profile | Design | "Proof of work: completed tasks and Tolken earned." |

## Show only if asked

- **Trades for you** (Inbox): the list of suggested swaps and rings, each showing what you give and what you get.
- **Explore** search and filters.
- **Source browser** on seeded projects that have code.

## Leave out

| Feature | Why |
|---|---|
| Custom swap | Removed from the UI; the old form didn't work. |
| Alerts tab | A second notification path; it competes with "invites are DMs". |
| Idea suggestions | Backend only, no screen. |
| Name-only sign-in details | Fine for a demo; don't invite security questions. |

## Technical talking points (for Q&A)

- **Matching:** each person and need becomes an edge scored by skill level, category overlap, shared tags, and whether the match goes both ways.
- **Cycles:** swaps are 2-cycles and rings are 3-cycles on the person-to-person "can help" graph, ranked by score.
- **Research agent:** plan queries → search → read pages in parallel → extract facts → write a report with citations → score cool factor. Runs live, or from a fixture when offline.
- **Stack:** FastAPI + Supabase (Postgres, Auth, RLS), Next.js 15 + React 19. An in-memory "world" cache is rebuilt after every write, so reads are fast and always fresh.
- **Tolken ledger:** pending → funded → released, with database checks so balances can't go negative.

## Roles on stage

- **Driver A** runs Maya's window (steps 1–5, 7, 9).
- **Driver B** runs Rin's window (steps 6, 8, 10).
- **Speaker** narrates using the "Say this" column and handles Q&A.
