# Demo script

One story, start to finish, in three beats: **Intersect → Connect → Collaborate** (see [TALK.md](TALK.md)).
About 3 minutes of demo. Every step was run in the browser on 2026-10-24 and re-checked with the smoke test
after the inbox split on 2026-10-25.

**The story:** Maya builds hardware. She has an idea she can't finish alone. Nodal shows her where her
world meets others, checks the idea, finds Rin (a sound designer who needs Maya's skills back), and
gets them from invite to paid work in one thread.

**Prompt fit (Connect & Intersect):** intersections feed, two-way matching, swap/ring graph.
**Technical:** live research agent with cited sources, graph cycle detection, Tolken ledger.

## Setup (before going on stage)

| Item | How |
|---|---|
| Two browser windows | Window A: normal, signed in as `maya`. Window B: incognito, signed in as `rin`. No signing out on stage. |
| Backend | `uvicorn app.main:app --port 8010` (no `--reload`; on Windows the reloader can leave a stale server holding the port). |
| Rehearsal check | `python -m scripts.demo_smoke` from `backend/`. Every step must print, ending with `cleaned up`. |
| Balances | Maya needs at least ◈ 50. Smoke test restores balances. |
| Research | `RESEARCH_MODE=live` takes 30–60 s and needs network. If the venue Wi-Fi is bad, use `fixture` (instant, sample sources). |
| Migration | Apply `backend/supabase/migrations/20261025000000_need_completion.sql` in the Supabase SQL editor. The demo works without it for bounty needs, but non-bounty needs then lose who submitted them. |
| Leftovers | Delete any earlier rehearsal project titled "Singing Plant" (Projects page → the project → delete). |

## The flow

Each step has one place it starts and one thing on screen that shows it worked.

## Beat 1: Intersect

### 1. The problem: intersections (Window A, Maya)
- **Start:** Home → **Intersections** tab.
- **Do:** Point at Campus Radio Map (creative) × Park&Go (software), both on `#campus #maps`.
- **End:** "These two teams work on the same thing and have never met. Nodal finds that overlap."

### 2. Post an idea
- **Start:** **Create**.
- **Do:** Idea · Hardware · Title `Singing Plant` · Caption `A plant that sings when you water it.` ·
  Looking for **Sound design**, bounty `50` · Tag `sensor-data` · leave both checks on → **Post and run both checks**.
- **End:** Results page opens, header says "Both checks running".

### 3. The research agent checks it
- **Start:** Results page, right column, **Market check**.
- **Do:** Narrate the live steps ("Searching: …"), then open **Cool factor**.
- **End:** A verdict with competitors, market size and numbered sources.

## Beat 2: Connect

### 4. People who fit, with a swap
- **Start:** Results page, left column, the graph.
- **Do:** Rin is first, with a teal ring and **Swap** label. Click her.
- **End:** The panel reads "Rin fills Sound design, and you can help with one of their projects too", with chips
  `Matches need: Sound design` and `Swap`.

### 5. Invite is a DM
- **Start:** **Invite to build** under Rin.
- **Do:** Keep the prefilled note → **Send invite**.
- **End:** "Invite sent to Rin. It's already in your Messages."

### 6. Rin's side (Window B, Rin)
- **Start:** Home → **Needs you** tab.
- **Do:** Singing Plant is there, tagged "Needs your Sound design". Then **Messages** (sidebar) → Maya → **Accept Invite & Start Working**.
- **End:** Toast "Joined Singing Plant! You're now on the team." and the card reads **Joined team!**

## Beat 3: Collaborate

### 7. Fund the bounty (Window A, Maya)
- **Start:** Singing Plant project → **Needs** tab.
- **Do:** **Fund ◈ 50**.
- **End:** Button turns into **Funded ◈ 50**. Toast "◈ 50 held for Sound design".

### 8. Rin hands in work (Window B)
- **Start:** Same project → **Needs** tab. Header shows **On the team**.
- **Do:** **Submit work**.
- **End:** Toast "Work submitted for review".

### 9. Maya confirms (Window A)
- **Start:** Refresh the Needs tab. The need shows **Submitted by Rin Castillo**.
- **Do:** **Confirm work and release** → **Confirm work**.
- **End:** **Done by Rin Castillo** and **Paid ◈ 50**. Toast "Work confirmed and bounty released".

### 10. The payoff (Window B)
- **Start:** Rin → **Profile**.
- **End:** A filled square on today in the contribution graph, and the sidebar Tolken balance is up ◈ 50.
  Open the **Tolken** tab: the ◈ 50 payment from Singing Plant is listed.
- **Close (Speaker):** "Nodal finds the people your project is missing, and the trades where helping each other costs nothing."

## If something goes wrong

| Symptom | Fix |
|---|---|
| Market check spins past 90 s | Open **Cool factor** and keep talking; or switch to `RESEARCH_MODE=fixture` and restart. |
| Rin not first on the graph | She still appears; click her. Swap people sort first. |
| No "Confirm work" button | Refresh. If still missing, Rin's submit didn't land; submit again in Window B. |
| Change to backend code not showing | Kill every `python.exe` running uvicorn and start it again. |
