# Nodal: Technical Design Doc

Hackathon prompt: **Connect & Intersect**. Build something that connects people, ideas, or tools, and explore what happens where they intersect.

## Overview

Nodal is a GitHub-style home for software, hardware, and creative projects, where each project can post what it needs from another discipline and the platform matches it to people who offer that skill. The match is the product; publishing and discussion are the surface it sits on.

**Theme fit:** the intersection of disciplines is the mechanism, not a side effect. A firmware gap in a hardware project meets a firmware dev; a game's missing sound designer meets a sound designer.

**Name:** Nodal. Each project is a node that connects people and ideas, and each needs/offers match is an edge between nodes. The match view can render this literally as a small node graph (a project in the center, the people who can fill its needs linked around it). That graph is an optional phase 3 item; the ranked list stays the primary view.

**Goals**

- Publish a project (software, hardware, or creative) with media and links
- Post needs and offers as structured skill tags
- See ranked matches both ways: "who can help my project" and "which projects need me"
- See reciprocal swaps and 3-way rings around a project, drawn as a node graph
- Discuss on a project via comments
- Pay contributors for work on a need (mock payments)
- Upload a project's source code as a zip, either open (anyone can read it) or closed (pay to unlock)
- Post an idea that others join and build with you
- Run an AI market-research agent on an idea and get a cited report on whether it looks viable as a company
- Get recommended ideas and projects to work on
- Demo end to end in under 3 minutes

**Non-goals (roadmap slide only)**

- Real payments (Stripe or otherwise); payments are mocked
- Guaranteed-accurate market verdicts; the research report is a cited starting point
- Embedding-based matching
- Notifications, DMs, moderation tooling, search beyond basic filters

## Core features and demo path

| Feature | Priority | Notes |
| --- | --- | --- |
| Auth (Supabase email or GitHub OAuth) | Must | Supabase handles it; no custom auth |
| Social app shell | Must | Feed, stories row, Explore grid, Inbox, Profile; identical screens on desktop and mobile. See Product shape |
| Stars and follows | Should | Star a project, follow a person; feeds the Following tab and the profile stats |
| Profile contribution graph | Could | GitHub-style heatmap of posts, comments, collabs, and uploads |
| Team shares and sell | Should | Members hold revenue shares; a closed project is listed for sale and test sales split by share |
| Create project (software, hardware, creative) | Must | Title, summary, cover image, links, tags |
| Needs and offers | Must | Fixed skill taxonomy plus free tags |
| Match view | Must | Centerpiece |
| Graph matching (reciprocal swaps, 3-way rings) | Must | The technical core; see Matching engine |
| Node graph view | Should | Project at center, fillers around it, rings highlighted |
| Comments | Must | Flat, no threading |
| Collab request | Should | One table, no real-time |
| Contributor payments (mock) | Should | Bounty on a need; owner funds through a fake checkout, then releases to the contributor; no real money |
| Intersections feed | Should | Projects sharing tags across types |
| Source upload: open or closed | Should | Upload a zip. Open is public; closed unlocks through the mock checkout. File tree, viewer, download |
| Ideas: post an idea, others join and build | Should | An idea is a project at stage `idea` with a README; reuses needs, matching, collab requests, and comments |
| Idea checks: market and cool factor | Should | The poster picks either, both, or neither. Market check: TinyFish plus an LLM, cited report with a verdict. Cool factor: a 1 to 10 score on novelty, demo appeal, fun to build with others, and scope. Fixture mode for the demo |
| Recommendations (For you) | Should | Ranked ideas and projects for you, from your skills and interests |
| LLM idea suggestions | Could | Generates ideas from your skills and platform gaps; one click to post |

**Demo script**

1. Log in as a hardware maker; open their plant-monitor project.
2. It shows a need: "firmware help (ESP32)."
3. Open People for this project: ranked list with the matching skill highlighted; one row is flagged "reciprocal".
4. Switch to Graph view: the project sits at the center, its fillers around it, and a 3-way ring (firmware, sound design, 3D modeling) lights up.
5. Send a collab request; switch accounts and accept. The owner funds the $50 bounty through the mock checkout and releases it; the contributor sees it as Released and their earnings go up.
6. Show the intersections feed linking the plant monitor to a generative art piece that uses sensor data.
7. Open a closed-source project's Source tab: the file tree shows but contents are locked. Unlock it through the mock checkout and read a file.
8. Post an idea from Create and switch on both checks. The result page shows the market report, the cool-factor score, and the People graph with the swap and the ring lit.
9. Accept the ring from Inbox, set team shares, and list the project for sale in test mode.
10. Open the Home feed's For you tab: ranked ideas with reason chips. Join one.

Seed 15 to 20 projects and 10 profiles beforehand, including one swap and one 3-way ring on purpose. Pre-run one research report in fixture mode so the demo never waits on the network.

## Judging fit

| Criterion | How Nodal answers it |
| --- | --- |
| Innovation | Cross-discipline needs/offers matching across software, hardware, and creative work; projects as nodes in a network; ideas others can join, and an AI agent that checks whether an idea looks viable |
| Technical complexity | Graph matching (directed graph over people and projects, swap and 3-way ring detection), a node graph view, JWT plus RLS across Next.js, FastAPI, and Supabase, a payment state machine (fund, release, refund) behind a swappable provider, safe zip ingestion with gated source access, and a citation-checked research agent on TinyFish and an LLM |
| Design and usability | A familiar social-app layout (feed, stories, Explore grid) with repo-style project pages, the same screens on desktop and mobile, color-coded project types, reason chips |
| Presentation | One 3-minute demo loop; a seeded ring so the graph lights up on cue |

## Product shape

Nodal looks and behaves like a social app for builders: Instagram's structure with GitHub's depth. Posts are projects and ideas; the feed is how people find each other.

**Instagram structure**

- Home feed with For you, Following, and Ideas tabs.
- A stories row of people who are ready to swap or complete a ring with you.
- Project posts: cover art, a call-to-action bar ("Needs ESP32 firmware" with a Join button), star, comment, and "people who fit" counts.
- Explore: a search box, filter chips, and a grid of cover tiles.
- Inbox for collaboration requests, swap invites, and ring invites.
- A left rail on desktop and a bottom tab bar on mobile with the same five destinations: Home, Explore, Create, Inbox, Profile.

**GitHub depth**

- Project page tabs: Code, Needs, Discussion, Activity.
- A file table with latest-change info, a README, a languages bar, stars, collaborators, and a license.
- Profile contribution heatmap and pinned projects.

**What is new in the flow**

1. **Create** is one screen for ideas and projects. Under the caption, the poster chooses what Nodal should check: **Market check**, **Cool factor**, both, or neither.
2. **Checks and people** (the result page) shows the chosen checks next to the People graph. The graph connects the post to people with matching skills, and highlights swaps and 3-way rings.
3. **Team and sell**: accepted collaborators become team members with revenue shares. A project can be listed for sale as open or closed source, and test sales split by share.

**Cool factor** is deliberately separate from the market check. It ignores money and scores how much people will want to watch and build the project: novelty, demo appeal, fun to build with others, and weekend-sized scope. It is a lens for projects that are worth doing even if they are not companies.

**Visual direction:** flat, white, and quiet. Plus Jakarta Sans for the interface and JetBrains Mono for file names and code. Cover art is generated CSS shapes tinted by discipline, so no image assets are required. The only motion is on interaction: switches, tabs, and selection. No entrance animations.

## Architecture

```
Browser (Next.js, shadcn/ui)
   |-- REST + Supabase JWT --> FastAPI (matching, feed, collab, payments, source, recommendations, research)
   |                              |-- user JWT (RLS applies) --> Supabase Postgres
   |                              |-- research agent --> TinyFish (search, fetch) and an LLM (OpenRouter; Ollama for local dev)
   |-- direct: login, comments, uploads --> Supabase (Auth, Postgres, Storage)
```

Rule: anything that needs logic goes through FastAPI; simple reads and writes go straight to Supabase.

**Deploy:** Next.js on Vercel, FastAPI on Render or Railway, Supabase hosted. Keep an `.env.example` listing every variable.

## Data model

Eight tables plus `unlocks`, `contributions`, `source_files`, and `source_contents`. `projects` gains `source_access` (none, open, or closed), `profiles` gains `earned_cents`, and `project_needs` gains `bounty_cents`. `projects` also gains `stage` (idea, building, shipped) and `readme_md`, and `profiles` gains `interests`. Three more tables: `research_runs`, `idea_suggestions`, and `recommendation_dismissals`. See `BACKEND.md` for the full SQL.

| Table | Purpose |
| --- | --- |
| profiles | One per user |
| projects | Published work or idea (type, stage, readme_md, links, source_access, price_cents) |
| skills | Seeded taxonomy (about 60 rows) |
| project_needs | What a project is missing |
| profile_offers | What a person can do, with level 1 to 3 |
| project_tags | Free tags for the intersections feed |
| comments | Discussion |
| collab_requests | Match follow-up |
| unlocks | Who has paid to unlock a closed-source project: (profile_id, project_id, amount) |
| source_files | File tree of an uploaded project: path, size, is_text |
| source_contents | Text of each file; service-role only so closed source cannot leak |
| research_runs | One market-research run per idea: status, live steps, report, sources, model |
| idea_suggestions | LLM-generated ideas for a user, with dismissed and posted flags |
| recommendation_dismissals | Items a user hid from their For you feed |
| contributions | A paid piece of work: need, owner, contributor, amount, status |

The graph is derived at query time from needs, offers, and ownership; it adds no tables.

RLS: public read on projects, comments, skills, needs; write only where `owner_id = auth.uid()` or `author_id = auth.uid()`. FastAPI calls Supabase with the user's JWT; the service key is for seed scripts only.

## Matching engine

v1 is rule-based over skill ids: deterministic, explainable on screen, cannot fail unpredictably mid-demo.

For each open need and available offer with the same `skill_id`:

```
score = 50 + 15 * (level - 1) + 20 * [same category] + 5 * min(tag_overlap, 3) + 25 * [reciprocal]
```

Sort descending, return the top 10, attach a `reasons` array so the UI can show why.

### Graph matching

Matching is a graph problem, which fits the name: each project is a node, and each needs/offers match is an edge.

Build a directed graph over people. An edge `u -> v` means u offers a skill that fills an open need on a project v owns, labeled with the skill and project. Then detect:

- **Swap (2-cycle):** u -> v and v -> u. You help my project, I help yours. This is the `reciprocal` flag and the +25 above.
- **Ring (3-cycle):** u -> v -> w -> u with three distinct people. Example: A's hardware project needs firmware, B offers firmware and B's game needs sound design, C offers sound design and C's art piece needs 3D modeling, which A offers.

Detection is set lookups for swaps and a two-step walk over the adjacency map for rings, so it runs in roughly O(edges times max out-degree), fine at hackathon scale. It stays rule-based and deterministic, so it cannot fail unpredictably mid-demo. Every cycle carries its links so the UI can explain it.

Embeddings are out of scope; the graph work is the technical depth instead.

## API (FastAPI, `/api/v1`)

See `BACKEND.md` for the endpoint table and contracts.

## Frontend

shadcn/ui (Lucide is its default icon set) over DaisyUI, wrapped in a custom social app shell. See `FRONTEND.md` and the mockup it was built from (16 artboards: 8 screens, desktop and mobile).

## Auth, paid access, security

- Supabase Auth: GitHub OAuth and email magic link; a DB trigger creates the `profiles` row on signup.
- Closed source: file contents and the zip are readable only by the owner or a user with an `unlocks` row; the file tree is a public preview. File text lives in a table with no read policies, and the zip sits in a private bucket behind 60-second signed URLs. Unlock is mocked (fake checkout, no money).
- Zip uploads: size, file-count, and expanded-size limits; reject `..`, absolute paths, and symlinks; skip `.git`, `node_modules`, and `.env` files; never execute or render uploaded code.
- Research agent: fetched pages are untrusted data; the agent has no tools beyond TinyFish search and fetch; API keys stay in backend env; per-user daily run limit.
- RLS on every table, tested with a second account.
- Service key never reaches the browser.
- Validate uploads (type, under 5 MB); rate-limit comments and collab requests; sanitize comment bodies.

## Ideas

An idea is a project with `stage = 'idea'`: a README (the problem, who it is for, the plan), tags, and needs. Because it is a project, everything else already works: needs and offers matching, collab requests ("Join this idea"), comments, bounties, and the node graph. When the team starts building, the owner graduates it (`stage` becomes `building`) and can attach source. Stages: `idea`, `building`, `shipped`.

## Market research agent

An owner can run a research agent on an idea. It searches the web with TinyFish, reads the best pages, and writes a cited report on whether the idea looks viable as a company.

**Pipeline** (fixed steps, not a free-roaming agent, so cost and behavior stay predictable):

1. Plan: the LLM turns the idea into up to 6 search queries across five angles: competitors and alternatives, evidence of the problem, market size and trends, pricing and business models, risks and regulation.
2. Search: TinyFish search for each query; dedupe results by domain.
3. Read: TinyFish fetch for the top 8 pages, as markdown.
4. Extract: the LLM pulls short facts from each page (competitor, demand, market size, pricing, risk), each tagged with its source URL.
5. Synthesize: the LLM writes the report from the facts only. Every claim must cite fact ids.
6. Check: the server drops any claim whose citations do not exist, and forces the verdict to "Not enough evidence" if there are fewer than 3 sources or no demand evidence.

**Report:** a verdict (Promising, Mixed, Weak, or Not enough evidence) with a confidence level, a summary, competitors, demand signals, market size, business models, risks, and next steps. Each item links its sources. A footer says it is AI-generated from web sources and is not business, legal, or financial advice.

**Models:** one OpenAI-compatible client configured by env. Use OpenRouter for anything deployed and Ollama for local development. Ollama runs on a developer machine, so a cloud-hosted backend cannot reach it. Small local models are also weaker at multi-source synthesis and valid JSON.

**Demo safety:** `RESEARCH_MODE=fixture` returns a stored report for the seeded idea, labeled "Sample report (demo data)", so a network or rate-limit failure cannot break the demo.

**Guardrails:** web pages are untrusted input and may contain instructions aimed at the model. The prompts treat them as data, the agent has no tools beyond search and fetch, and the output is validated JSON that the UI renders as plain text. Limits: 3 runs per user per day, a 3-minute timeout (a partial report is saved), and a 24-hour cache per idea text.

## Recommendations

- **For you (rule-based, reliable):** a ranked feed of ideas and projects that fit you, reusing the matching score: a need that fills a skill you offer, shared tags with your interests and projects, a different type than your own work (to favor intersections), recency, and a bonus when a swap exists. Your own projects, ones you already joined, and ones you dismissed are excluded. Each item shows reason chips.
- **Idea suggestions (LLM, optional):** the LLM reads your skills, interests, and the platform's open needs and trending tags, then proposes 3 ideas with a one-line "why you". One click posts a suggestion as an idea. Skill ids must exist in the taxonomy; anything else is dropped.

## Source code

Users can upload a project's source as a zip, like a simplified GitHub. Each project has a `source_access` setting:

| Mode | Who sees the file tree | Who reads files and downloads | Price |
| --- | --- | --- | --- |
| none | No source | No source | None |
| open | Everyone | Everyone, no login needed | Free |
| closed | Everyone (a preview) | The owner and users who unlocked it | `price_cents`, minimum $1 |

**Flow:** the owner picks a mode and uploads a zip. The server checks limits, skips dependencies and secrets, and builds a file tree. The Source tab on the project page shows the tree and a file viewer. On a closed project a visitor sees the tree with lock icons; Unlock goes through the mock checkout, the owner's earnings go up, and the files open.

**Not a git host:** there are no commits, branches, or diffs. A re-upload replaces the snapshot. Versions and diffs are a roadmap item.

## Payments (mock)

Owners can attach a bounty to a need; the contributor is "paid" when the owner releases it. Payments are mocked end to end: no Stripe, no real money, and every payment screen is labeled "Demo payment". The state machine and flow match a real escrow, so a provider can replace the mock later.

**Flow**

1. The owner adds a need with an optional bounty (`bounty_cents`).
2. A contributor requests to collab; the owner accepts. If the need has a bounty, accepting creates a `contributions` row in `pending_funding`.
3. The owner clicks Fund and lands on a fake checkout page (prefilled demo card, clearly labeled). **Pay** marks the contribution `funded`.
4. When the work is done, the owner releases it: the status becomes `released` and the contributor's `earned_cents` goes up.
5. Before release, the owner can cancel: a funded bounty becomes `refunded`, an unfunded one `cancelled`. Only the status changes; no money moves.

Statuses: `pending_funding` to `funded` to `released`; `funded` to `refunded`; `pending_funding` to `cancelled`. Nothing moves out of `released`.

**Rules**

- One function enforces the allowed status transitions; every payment endpoint checks ownership in code.
- Money is integer cents; the platform fee is configurable (`PLATFORM_FEE_BPS`, default 0).
- The mock-pay endpoint only works when `PAYMENTS_MODE=mock`, so it cannot fake payments if a real provider is added later.
- A small `PaymentProvider` interface with a `MockProvider` keeps the swap cheap.

**Roadmap line for the demo:** Stripe Connect (Express accounts, Checkout to fund, a transfer on release) plugs in behind the same interface. Live-mode payouts need Stripe account review and legal review, so they are out of scope.

## Build plan

Phases are sequential by gate, not by clock. Assumes three people.

| Phase | Work | Exit gate |
| --- | --- | --- |
| 1. Foundation | Schema (including idea stage and README), auth, skills seed, create and list projects and ideas | Log in and create a project |
| 2. Core loop | Needs and offers, matching API and UI, graph service (swaps, rings) | Match list works and the seeded ring is detected |
| 3. Polish | Graph view, comments, collab asks, feed, source upload with mock unlock, mock contributor payments, research agent, For you feed | Demo script runs clean twice |
| 4. Freeze | Seed 15 to 20 projects, deploy, rehearse | Deployed link works on a phone |

| Role | Owns |
| --- | --- |
| Frontend | App shell (rail and tab bar), PostCard, feed, Explore grid, project page, People graph, shadcn components |
| Backend | FastAPI endpoints, matching query, JWT dependency, deploy |
| Data and demo | Schema and RLS, skills seed, seed projects, demo script, slides |

**Cut order if behind:** profile contribution heatmap, the stories row, LLM idea suggestions, intersections feed, the source file viewer (keep the zip download), accept/decline on collab requests (keep "request"), graph view polish (fall back to listing each cycle as text), then contributor payments. If the choice is research agent or payments, keep the research agent. Never cut the match view or cycle detection.

**Risks**

- Thin seed data makes matching look empty: write a rerunnable seed script in phase 1.
- RLS blocks writes unexpectedly: test with two accounts early.
- JWT or CORS trouble between Next.js and FastAPI: ship one protected endpoint end to end in phase 1.
- Taxonomy too coarse: try 10 realistic needs against it before phase 2 closes.
- Cycle detection finds nothing on thin data: seed one swap and one ring on purpose.
- Mock payments read as real: label every payment screen "Demo payment, no money moves" so nobody is misled.
- Zip uploads are an attack surface (zip bombs, path traversal, leaked secrets): enforce the limits in `BACKEND.md` and test with a malicious zip before the demo.
- The research agent gives a confident verdict from thin or wrong evidence: it must cite sources, the server forces `not_enough_evidence` on thin results, and the UI labels it AI-generated.
- Ollama cannot be reached from a cloud backend: use OpenRouter for the deployed demo and keep Ollama for local development only.
- Live web or rate-limit failures during the demo: keep `RESEARCH_MODE=fixture` ready and pre-run one report.
- Prompt injection from fetched pages: treat pages as data, give the agent no extra tools, and validate its output.
- Cool factor reads as a fact: label it "AI score", show the four measures, and never present it as demand.
- Two layouts double the front-end work: build the app shell and PostCard once as responsive components, and build mobile from the same data hooks.
- Share splits that do not total 100%: block listing until they do, and show the total live.
