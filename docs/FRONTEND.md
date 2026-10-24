# FRONTEND.md: Nodal (Next.js)

Instructions for Claude: build the frontend for Nodal described here. Read `DESIGN.md` for product context and `BACKEND.md` for the API. Optimize for speed to a working demo and a clean mobile layout; skip anything not listed.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- shadcn/ui components, `lucide-react` icons (shadcn's default; do not add DaisyUI)
- `@supabase/ssr` and `@supabase/supabase-js` for auth and direct reads/writes
- TanStack Query for data fetching
- `react-hook-form` with `zod` for forms
- `@xyflow/react` (React Flow) for the node graph view
- `react-markdown` with `remark-gfm` for READMEs (raw HTML disabled)
- `next/font` with Plus Jakarta Sans (interface) and JetBrains Mono (file names, code)
- `openapi-typescript` to generate API types from the FastAPI `/openapi.json`

## Layout

The app is a social shell. One responsive `AppShell` wraps every signed-in route: a left rail at 1024px and wider, and a bottom tab bar below that. Both show the same five destinations: Home, Explore, Create, Inbox, Profile.

```
frontend/
  app/
    layout.tsx                      # fonts, providers, AppShell
    page.tsx                        # / Home feed
    explore/page.tsx
    create/page.tsx                 # new post: idea or project; checks for ideas
    projects/[id]/page.tsx          # project page (Code, Needs, Discussion, Activity)
    projects/[id]/results/page.tsx  # ideas: checks and People graph; projects: People only
    projects/[id]/team/page.tsx     # team and shares
    inbox/page.tsx
    u/[handle]/page.tsx             # profile (own profile is /u/me)
    onboarding/page.tsx             # skills, interests, people to follow
    login/page.tsx
    auth/callback/route.ts
  components/
    ui/                             # shadcn generated
    shell/
      AppShell.tsx                  # picks SideRail or TabBar by breakpoint
      SideRail.tsx                  # wordmark, five links, unread badge on Inbox
      TabBar.tsx                    # five icons, Create is a filled button
    feed/
      StoryRow.tsx                  # people ready to swap or ring (teal ring) and "Your idea"
      FeedTabs.tsx                  # For you, Following, Ideas
      PostCard.tsx                  # header, CoverArt, CtaBar, actions, caption
      CtaBar.tsx                    # "Needs ..." text and a Join or Offer to help button
      CoverArt.tsx                  # CSS cover from {pattern, tint}, or cover_url
      ExploreGrid.tsx               # square tiles, 4 columns desktop, 2 mobile
      SideSuggestions.tsx           # desktop right column: swaps ready, needed most
    project/
      ProjectHeader.tsx
      ProjectTabs.tsx
      FileTable.tsx                 # GitHub-style rows, mono names
      LanguageBar.tsx
      AboutPanel.tsx                # description, tags, stats, license, looking for
      Readme.tsx                    # safe markdown renderer
      NeedList.tsx
      CommentThread.tsx
      SourceBrowser.tsx
      SourceUpload.tsx
      SourceBadge.tsx               # Open source only
      StageBadge.tsx                # Idea, Building, Shipped
    checks/
      ChecksToggle.tsx              # two switches: Market check, Cool factor
      CheckTabs.tsx                 # Market check and Cool factor tabs (and People on mobile)
      ResearchReport.tsx            # verdict, sections, source chips
      CoolFactorCard.tsx            # score and four measure bars
      ResearchPanel.tsx             # run button, live steps
    people/
      PeopleGraph.tsx               # nodes, edges, selection (see Graph view)
      PersonDetail.tsx              # reasons, Invite to build, Message
      CycleCard.tsx
      MatchList.tsx
      RingInviteCard.tsx            # who does what for whom, Accept ring, Decline
    team/
      TeamList.tsx
      ShareBar.tsx                  # segmented Tolken-share bar and total
      BountyInput.tsx               # Tolken bounty per need
    onboarding/
      OnboardingWizard.tsx          # skills, interests, people to follow
    profile/
      ProfileHeader.tsx
      SkillChips.tsx
      ContributionGraph.tsx         # heatmap, 52 weeks desktop, 27 mobile
      ProfileGrid.tsx
    forms/
      PostForm.tsx                  # Create screen (idea or project)
      SkillPicker.tsx
      OfferEditor.tsx
      InterestsEditor.tsx
    TypeBadge.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    api.ts
    api-types.ts
    cover.ts                        # pattern and tint helpers
    utils.ts
  .env.example
```

## Visual design

- **Fonts:** Plus Jakarta Sans (400, 500, 600, 700, 800) for the interface; JetBrains Mono (500) for file names, branch pills, and code. Body 14 to 16px; post titles 22px at weight 800 with tight tracking.
- **Colors (Tailwind tokens):** ink `#101C26`, muted `#5B6B78`, line `#E3E8EC`, sunken `#F5F7F9`, white surface. Primary action teal `#0F766E` (tint `#E2F3F0`). Cool factor orange `#C2410C` (tint `#FCE8DD`). Disciplines: software `#1F4FD8` (tint `#E3EAFB`), hardware `#8A5A00` (tint `#F6ECD3`), creative `#BE185D` (tint `#FBE4EE`). A teal line always means a swap or a ring.
- **Shape:** 12px radius on tiles and inputs, 16px on post cards and panels, full round on avatars and chips. One hairline border, no shadows.
- **Cover art:** `CoverArt` draws flat CSS shapes from `{pattern, tint}` (rings, bars, blocks, stripes, dots) in the discipline tint, with the title over it on posts. No image assets are needed. Use `cover_url` when a project has one.
- **Motion:** none on page load. Motion only answers a tap: switch knobs, tab changes, node selection. Respect `prefers-reduced-motion`.
- **Touch and focus:** 44px minimum targets, a 3px blue focus ring, `aria-pressed` on toggle buttons, `role="switch"` and `aria-checked` on the checks switches.
- **Copy:** sentence case, plain verbs ("Join this idea", "Offer to help", "Post and run both checks"). Label AI output "Sample" in fixture mode and add the AI footer.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Routes

| Route | Shows | Key components |
| --- | --- | --- |
| `/` | Signed-out landing: value prop, sign-in card (name only), match preview, how it works, swaps and rings | SignInForm, MatchPreview, LandingPage |
| `/feed` | Stories row, For you, Following, and Ideas tabs, PostCards; composer; onboarding nudge; right column of swaps and needed skills | Composer, StoryRow, FeedTabs, PostCard, SideSuggestions, OnboardingPrompt |
| `/explore` | Search, filter chips (All, Needs you, Ideas, Software, Hardware, Creative, Open source), tile grid | ExploreGrid |
| `/create` | New post: cover preview, title, caption, Looking for, You bring, checks switches (ideas only), submit | PostForm, SkillPicker, ChecksToggle |
| `/projects/[id]` | Header with Star, Follow, Offer to help; tabs Code, Needs, Discussion, Activity; file table, README, About panel | ProjectHeader, ProjectTabs, FileTable, Readme, AboutPanel, LanguageBar, NeedList, CommentThread, SourceBrowser |
| `/projects/[id]/results` | Ideas: Market and Cool factor checks beside the People graph. Projects: People who fit only. Owners invite from here | CheckTabs, ResearchReport, CoolFactorCard, PeopleGraph, PersonDetail, InviteDialog |
| `/projects/[id]/team` | Team and shares for Tolken bounties, still-open needs | TeamList, ShareBar |
| `/inbox` | Requests, Sent, and Messages; join/swap/ring requests with Accept or Decline; DM threads with invites and follow-ups | RingInviteCard, ConversationRow, MessageThread |
| `/u/[handle]` | Profile: stats, I offer, interests, swaps and rings, contribution graph, Projects, Ideas, Starred, Tolken, **Message** | ProfileHeader, SkillChips, CycleCard, ContributionGraph, ProfileGrid |
| `/onboarding` | Three steps: skills, interests, people to follow; saves the profile matching uses | OnboardingWizard |
| `/login` | Name-only sign-in; auth lands on `/onboarding` | SignInForm |

Protect `/create`, `/inbox`, `/u/me`, and `/projects/[id]/team` with a server-side session check that redirects to `/login`. Older routes (`/requests`, `/ideas`, `/for-you`, `/projects/new`, `/ideas/new`, `/me`) are replaced: Ideas and For you are tabs on `/`, requests live in `/inbox`, and creation is `/create`.

## Data access rules

- Via the FastAPI (`lib/api.ts`, JWT in `Authorization`): projects list/detail/create, matches, feed, collab requests, source upload and viewing, offers. Send the token when logged in, but allow source browsing without one for open projects.
- Direct to Supabase: login, comments (read and insert), image upload to Storage, profile edits.
- Never expose the service key. Only the anon key is in the browser.
- There is no money and no checkout. Tolken is the in-app currency, stored as an integer balance; bounties move Tolken between accounts.

## Screens in detail (social app)

Every screen below has a desktop and a mobile version built from the same components and data. On mobile the rail becomes the tab bar and two-column pages stack.

### Landing (`/`)
- Signed-out first screen, no app chrome. Sticky header (logo, How it works, Swaps and rings, Sign in), then a two-column hero: the promise, three proof points, and a bordered **Sign in with your name** card on the left; a sample project + People who fit preview with an "Invite sent to Maya" strip on the right.
- Below: **How it works** (three numbered steps, sunken band) and **Swaps and rings** (three explicit give/get links next to the explanation). Closing band links back to `#sign-in`. The preview is labeled sample data; nothing on the page fakes a signed-in state.
- Sign-in is the only form: name, one primary button, and "Your session stays in this browser." Returning visitors get **Continue as {name}** instead.

### Home (`/feed`)
- **Composer:** avatar + "Share an idea or a project…" + **New post** (a sign-in prompt and **Sign in** for guests).
- **StoryRow:** bordered **People to build with** row, 52px avatars, teal ring with a white offset for swap/ring, handle on the second line. Tapping one opens Inbox or their profile.
- **FeedTabs:** For you, Following, Ideas. Use `GET /feed?tab=` with cursor pagination and skeleton posts while loading. Guests get one sign-in state instead of a failed request.
- **PostCard:** owner header with avatar and relative time, 5:2 cover, title, meta, three-line caption, compact need chips with fit counts, then Star, Comments, and the Collab button.
- **Desktop right column:** profile card with skills, swaps with **Give/Get** lines and an honest empty state, and most-needed skills with counts.

### Explore (`/explore`)
- Search box and filter chips (toggle buttons with `aria-pressed`). Tiles are square `CoverArt` with a caption (title, type and source line). An Idea pill sits top right; there is no price pill. 4 columns on desktop, 2 on mobile.

### Onboarding (`/onboarding`)
- Shown right after login, and reachable from the home nudge until it is finished. No rail or tab bar.
- Three steps with a progress bar: **skills** (chips from the skill list, at least one), **interests** (tag chips, at least one), **people to follow** (six suggested people with their skills and a Follow toggle).
- Finish saves skills and interests (the inputs matching reads) and returns to `/`. Skip marks it done with the defaults so the demo is never blocked.
- Copy makes the payoff explicit: matching finds ideas that need your skills; interests steer recommendations; follows fill the Following tab.

### Create (`/create`)
- Left: cover preview (shuffle art or upload). Right: Title, Caption, **Looking for** (SkillPicker chips with remove), **You bring** (chips), then, for ideas only, **What should Nodal check?** with two `ChecksToggle` switches (Market check, Cool factor). The submit button text follows the switches: "Post and run both checks", "Post and run market check", "Post and score cool factor", or "Post". Posting as a project shows "Post project" and no checks.
- On submit: `POST /projects` (stage `idea` unless the user chose Project), then `POST /projects/{id}/research` with the selected `checks` if any, then go to `/projects/[id]/results`. With no checks, go to the project page.

### Project page (`/projects/[id]`)
- Header: 120px cover, title, badges (Open source when it has source, type), owner and "updated" line, buttons **Star** (with count), **Follow**, **Offer to help**.
- Tabs with count badges: Code, Needs, Discussion, Activity. Code shows a branch pill, latest-change row with **Download zip**, `FileTable` (folders first, mono names, short message, age), then the README in a bordered panel. Source is always open to read and download.
- Right column (desktop): About (summary, tags, stars, collaborators, license), **Looking for** with an **Offer** button per need, `LanguageBar`, collaborator avatars. On mobile these collapse into a stats row, the action buttons, the language bar, and a "Looking for" strip.
- Owner buttons: **View checks** on an idea, **People who fit** on a project, and **Team**.

### Checks and people (`/projects/[id]/results`)
- Header: small cover, title, StageBadge, "Posted just now", **View post** and **Start building**.
- **Ideas only.** Market check: verdict badge, confidence, "Sample report" badge in fixture mode, summary, Competitors, Demand, Risk, Next steps, source chips, AI footer. Cool factor: big score, one line explaining it ignores money, four measure bars (novelty, demo appeal, fun to build with others, weekend-sized scope), and a short "why". Poll `GET /research/{id}` every 2 seconds while a check is running and show steps as in the Research section below.
- **PeopleGraph** and **PersonDetail** (see Graph view). On mobile an idea shows three tabs (People, Market, Cool factor); a project shows the People view only, with no check tabs anywhere.

### Team and shares (`/projects/[id]/team`)
- **Team and shares:** `ShareBar` (segmented, total shown), then one row per member: avatar, name, role or status (owner, joined, invited), skills, share percent. A pending member shows a dashed avatar and "set a share when she accepts". A "Still open" row suggests inviting the next best person.
- Shares split Tolken bounties. There is no seller, no price, no checkout, and no sales list.

### Inbox (`/inbox`)
- Two-pane on desktop (thread list left, selected thread right); a single list on mobile with inline actions. Filters: Requests, Sent, Messages (with an unread count).
- **Requests and Sent:** ring, swap, and join requests. **RingInviteCard** lists who does what for whom ("You do UI design for Dev's game"), with **Accept ring** and **Decline**. Swap invites use the same card with two rows. A join request shows the person, the skill, and Accept or Decline. After all members accept a ring, link to `/projects/[id]/team`.
- **Messages:** one row per person (avatar, last line, kind, project, unread). Opening a thread marks it read and shows the invite, any follow-up, and free-form replies as bubbles. While an invite is unanswered, the sender sees **Invite sent. No reply yet.** with **Ask if they've seen it**, which posts one nudge in the same thread.

### Invite to a project (owner)
- On `/projects/[id]/results`, the owner's **Invite to build** on a person opens `InviteDialog`. Optional note, then **Send invite**.
- The confirmation is explicit: "Invite sent to Priya. It's already in your Messages with Priya, and they see it as a DM." From there the owner can **Ask if they've seen it** (one follow-up) or **Open messages**. There is no second notification system to check — the confirm and the DM are the same row.
- Invitees see the invite in Messages and on their own unread count; they reply in the same thread. The endpoint rejects a second invite until they answer (409), so follow-up is the correct action instead of duplicate invites.

### Profile (`/u/[handle]`)
- Header: 120px avatar (76px mobile), handle, **Edit profile** and **Share profile** on your own, stats (projects, stars, collaborations, followers), bio.
- **I offer** SkillChips with levels (discipline tint) and an Edit link. **Swaps and rings** card with View links to the Inbox thread.
- **ContributionGraph:** `GET /profiles/{handle}/activity`; 52 weeks on desktop, 27 on mobile; 5 teal levels; cells 12px desktop, 9px mobile; the container has `role="img"` and an `aria-label`.
- Tabs Projects, Ideas, Starred, Tolken. Projects and Ideas show a 3-column `ProfileGrid` of tiles. Tolken shows the balance, released total, and bounty history in Tolken.

### Older screen notes
The sections below (Project detail, Me, Graph view, CycleCard, Ideas, Research, For you, Source code, Tolken) still describe behavior and data. Where they name an old route or layout, use the screens above.

## Behavior details

### Project detail (`/projects/[id]`)
- Header: cover image, title, TypeBadge, owner handle, links (repo, demo).
- Header shows SourceBadge. Source is always open, so `repo_url` is always visible when present. The Source tab is described under Source code.
- Needs section: NeedBadge list with skill name, note, status.
- "People for this project": MatchList from `GET /projects/{id}/matches`. Each row: avatar, name, skill matched, score, reason chips, primary button **Request collab** (opens a dialog with a message field).
- List/Graph toggle (shadcn Tabs) on the matches section. Graph tab renders GraphView from `GET /graph/projects/{id}`. Rows with `reciprocal: true` show a "Swap" badge.
- Comments: flat list plus a form; optimistic update.

### Me (`/me`)
- OfferEditor: pick skills and level 1 to 3, availability toggle; saves with `PUT /me/offers`.
- "Help wanted for you": MatchList from `GET /me/matches`; each row shows project, need, score, reasons, **Request collab**.
- "Swaps and rings": CycleCard list from `GET /me/cycles`.

### Graph view (`GraphView.tsx`)

The visual form of the name: projects and people are nodes, and matches are edges. Data from `GET /graph/projects/{id}` (see `BACKEND.md`).

- React Flow with two custom node types: `ProjectNode` (color-coded by project type, shows title) and `ProfileNode` (avatar and handle).
- Layout is computed in code, no layout library: root project at the center, depth-1 profiles on an inner circle, depth-2 nodes on an outer circle, evenly spaced by angle.
- Edges: `fills` edges are labeled with the skill name; `owns` edges are thin and unlabeled.
- Edges whose `cycle_ids` is non-empty use the accent color, thicker stroke, and animate; everything else is muted. Hovering a cycle edge highlights the whole cycle.
- Click a project node to go to its page; click a profile node to open a profile popover with a **Request collab** button.
- Legend for the three project type colors. `fitView` on load; minimum height 360px; pan and pinch work on touch.
- If the response has no cycles, show the graph without highlights; do not add an empty state message.

### CycleCard (`/me`)

For each item from `GET /me/cycles`: a badge (Swap or Ring), the members as avatars joined by arrows, and one line per link ("You give ESP32 firmware to @B's Plant Monitor"). Button: **Open graph** goes to the first project in the cycle.

### Ideas

An idea is a project at stage `idea`; reuse the project pages.

- `/create` in idea mode: PostForm with title, one-line pitch (summary), README (markdown textarea with a live preview tab using Readme), tags, and needs (SkillPicker, optional bounty). Posts `POST /projects` with `stage: "idea"`. Source upload is hidden in idea mode.
- The Ideas tab on `/` and the Ideas chip on `/explore` filter with `stage=idea`.
- Project page: StageBadge in the header and a Readme section that renders `readme_md`. Visitors see **Join this idea**, which opens the existing collab request dialog (pick a need that fits, add a message). Comments work as they are.
- Owner of an idea sees **Graduate to building** (`PATCH` with `stage: "building"`), which then reveals SourceUpload.
- Readme: render with `react-markdown` and `remark-gfm`, raw HTML disabled; external links open with `target="_blank"` and `rel="noopener noreferrer"`.

### Research (ResearchPanel, ResearchReport)

Shown to the owner on an idea, and to everyone as a read-only report when `is_public` is true.

- Button **Research this idea** calls `POST /projects/{id}/research`. If the response has `cached: true`, show the existing report with "Reused from earlier today". On 429, toast the API's message.
- While `status` is `queued` or `running`, poll `GET /research/{id}` every 2 seconds and show `steps` as a live checklist (newest first, spinner on the latest). Stop polling at `done`, `partial`, or `failed`, or after 4 minutes.
- ResearchReport: a verdict badge (Promising, Mixed, Weak, Not enough evidence) with the confidence level, the summary, then sections for Competitors (a table: name, what they do, sources), Demand signals, Market size, Business models, Risks, and Next steps. Each cited item shows small source chips (the domain, linking out) found by `fact_ids` in `sources`. Render all text as plain text.
- If `is_sample` is true, show a "Sample report (demo data)" badge at the top. If `status` is `partial`, show "Partial report: the run timed out". If `failed`, show the error and a **Try again** button.
- Always show the footer: "AI-generated from web sources. A starting point, not business, legal, or financial advice. Verify before acting."
- Owner toggle **Show on idea page** calls `PATCH /research/{id}` with `is_public`.

**Checks:** the Create screen sends `checks`. Show a tab per chosen check on the results page. A check that is still running shows its steps; the other can already be readable. For Cool factor, show "AI score" next to the number and the four measure reasons as a tooltip or an expandable row. Do not show a Cool factor tab when it was not chosen, but offer **Run cool factor** or **Run market check** from the empty state.

### For you (RecommendationList, IdeaSuggestionCard)

- The For you tab on `/` shows posts from `GET /feed?tab=for_you` (ranked by `GET /me/recommendations`), with a stage filter (Ideas, Projects, All; default Ideas). Each row has the project card, StageBadge, reason chips, **Join** (opens the collab dialog), and **Not interested** (`POST .../dismiss`, removes the row optimistically).
- Home: a "For you" strip with the top 3 when logged in, linking to the For you tab.
- `/me`: InterestsEditor (tag input, up to 10, saves with `PUT /me/interests`). When the For you list is empty, prompt the user to add interests.
- **Start something** tab: button **Generate ideas** (`POST /me/idea-suggestions/generate`, with a loading state). Each IdeaSuggestionCard shows the title, pitch, "Why you", needed skills as badges, **Post as idea** (`POST .../post`, then navigate to the new project), and **Discard**. Show "AI suggestions, not validated demand" under the cards. Toast the message on 429.

### Source code

**SourceUpload** (in ProjectForm and on the owner's project page):

- Radio group: **No source**, **Open source** (anyone can read and download). There is no closed or paid option.
- Zip picker with drag and drop; a native file input is fine. Show the limits ("Max 25 MB, 1000 files") and a note that `.git`, `node_modules`, and `.env` files are skipped. Reject non-.zip files client-side.
- Call order: `PATCH /projects/{id}` with `source_access`, then `POST /projects/{id}/source`. Show a spinner while uploading, then the result: file count and skipped count ("Skipped 214 files (dependencies and secrets)"). Show API errors (too big, bad paths) as toasts.

**SourceBrowser** (Source tab on `/projects/[id]`, shown when `has_source` is true):

- Left: a file tree built from `GET /projects/{id}/source/tree` with collapsible folders and lucide `Folder` and `File` icons. Right: the file viewer.
- Clicking a text file calls `GET .../source/file?path=` and shows it in a `<pre>` with line numbers, as plain escaped text (never `dangerouslySetInnerHTML`). Binary files show "Binary file, download the zip". A **Download .zip** button calls `GET .../source/download` and opens the returned URL.
- Skeleton while the tree loads. Empty state "No source uploaded", with an **Upload source** button for the owner.

**SourceBadge** (ProjectCard and project header): Open source with lucide `LockOpen`. Hidden when there is no source.

### Tolken (in-app currency)

There is no money in Nodal: no checkout, no prices, no payouts. Tolken (`◈`) is the in-app currency and every amount is a whole number of Tolken.

- ProjectForm: each need gets an optional **Bounty** field (BountyInput) in Tolken.
- NeedBadge and NeedRows show the bounty in Tolken when one is set, for example `◈ 40 bounty`.
- An owner funds a bounty from the project's Needs tab. The balance drops, the bounty is marked **Funded**, and the split follows the team shares. Accepting a collab request on a funded need marks it for release.
- The profile's Tolken tab shows the balance, the released total, and each bounty's history (Released, Funded). No card field, no test card, no hosted-checkout screen.
- Show API `detail` messages (for example insufficient balance) as toasts.

### Create project
- ProjectForm (zod validation): type, title, summary, cover upload, repo/demo links, source (SourceUpload: none or open), tags, needs (SkillPicker plus note per need, optional Tolken bounty). In idea mode (`mode="idea"`) the form hides source and repo/demo links, adds a README field, shows the check switches, and sends `stage: "idea"`.

### Home
- Intersections feed from `GET /feed/intersections`: card pairs showing two projects of different types and the shared tags.

## UX rules

- Same screens, two layouts: build `AppShell`, `PostCard`, and the page components once and let them reflow. Test both at 1280 and 390 wide.
- Color-code the three project types everywhere via `TypeBadge` and cover tints so cross-discipline matches read at a glance.
- Every match or recommendation shows reason chips (for example "Fills: ESP32 firmware", "Level 3") and one primary button.
- Skeleton loaders for feeds and grids; optimistic updates for stars, follows, comments, and dismissals; toasts for errors.
- Show every API `detail` message as a toast or inline error, whichever is closer to the control.
- Use `lucide-react` for every icon.
- Keep it flat and quiet: one border color, no shadows, no entrance animation.

## Definition of done

1. Log in with GitHub or magic link, then finish onboarding: pick skills, interests, and people to follow.
2. The Home feed shows the stories row and PostCards; the For you, Following, and Ideas tabs change the list.
3. Create an idea with a need and the two check switches; the submit text follows the switches; submitting opens the results page. Posting as a project shows no checks and opens the project page.
4. Results page: the chosen checks show in tabs (steps stream while running; sample badge in fixture mode), and the People graph shows the seeded swap and ring in teal; selecting a person updates PersonDetail. A project's results page shows people only.
5. Send a collab request or ring invite; the other user sees and responds in `/inbox`.
6. A project page shows the file table, README, About, and Offer to help; star and follow toggle optimistically.
7. Team page: shares total shows live; shares are labelled as splitting Tolken bounties, with no sell or checkout panel anywhere.
8. Source: an owner uploads a zip as open source and a logged-out visitor can browse and download it.
9. Bounties: an owner funds a bounty in Tolken from the Needs tab; the balance drops and the need reads Funded. No payment screen exists.
10. Profile shows stats, I offer, interests, Swaps and rings, the contribution graph, the project grid, and the Tolken tab.
11. Explore filters work and the grid reflows from 4 columns to 2.
12. Every screen holds at 390px width with the tab bar visible, and at 1280px with the rail; onboarding and login are full-screen.

## Build order

1. `create-next-app`, Tailwind tokens from Visual design, `shadcn init`, add components: button, card, badge, dialog, command, popover, tabs, input, textarea, form, skeleton, sonner, switch
2. Supabase clients, login page, auth callback, `AppShell` with `SideRail` and `TabBar` (session state, Inbox badge)
3. `lib/api.ts` plus generated types; one protected call to prove the JWT path
4. `CoverArt`, `PostCard`, `StoryRow`, `FeedTabs`, and the Home feed
5. `PostForm` and `/create` with `ChecksToggle`, `SkillPicker`
6. Project page: header, tabs, `FileTable`, `Readme`, `AboutPanel`, `NeedList`, `CommentThread`
7. `ExploreGrid` and `/explore`
8. `PeopleGraph`, `PersonDetail`, `MatchList`, `CycleCard`; ship CycleCard first if behind
9. Results page: `CheckTabs`, `ResearchReport`, `CoolFactorCard`, polling
10. Inbox: `RingInviteCard`, `RequestRow`, accept and decline
11. Team page: `TeamList`, `ShareBar`, source upload and browser
12. Profile: `ProfileHeader`, `SkillChips`, `ContributionGraph`, `ProfileGrid`, Tolken balance
13. Onboarding wizard: skills, interests, follows; wire it after login and from the home nudge
14. Stars, follows, recommendations (For you ranking), idea suggestions
15. Polish and a mobile pass at 390px
