# Nodal — Developer & Team Handoff Document

**Document Version:** 1.0.0  
**Repository Branch:** `main`  
**Last Updated:** October 2026  
**Status:** Feature Complete, Verified & Production-Ready  

---

## 1. Executive Summary

**Nodal** is a collaborative ecosystem designed to connect founders, developers, designers, and creatives through skill-matched projects, AI-powered feasibility checks, two-way and multi-party resource swaps (Rings), and an escrowed bounty economy (Tolken).

Over recent sprints, the platform was elevated from a prototype into a fully interactive platform with closed-loop workflows for all major lifecycle actions: project management, collaboration requests, work submission and escrowed bounty release, image uploads, notifications, custom swaps, and UX polish (zero unwanted scrollbars, multi-port CORS compatibility).

---

## 2. System Architecture

```
                    ┌───────────────────────────────────────────┐
                    │           Next.js 15 (React 19)           │
                    │        Tailwind CSS v4 + Lucide Icons     │
                    │      Ports: 3000, 3001, 3002 (CORS OK)    │
                    └─────────────────────┬─────────────────────┘
                                          │ REST / JSON & FormData
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │              FastAPI Backend              │
                    │         Uvicorn on port 8010              │
                    │    Pydantic v2 + SlowApi Rate Limiter     │
                    └──────────────┬─────────────┬──────────────┘
                                   │             │
                PostgREST / Auth   │             │ Public Storage Uploads
                                   ▼             ▼
  ┌──────────────────────────────────┐         ┌──────────────────────────────────┐
  │         Supabase Postgres        │         │      Supabase Storage Bucket     │
  │     (Tables, Constraints, Views) │         │             ("images")           │
  └──────────────────────────────────┘         └──────────────────────────────────┘
```

### Technology Stack
- **Frontend:** Next.js 15.1 (App Router), React 19, TypeScript, Tailwind CSS v4, `@base-ui/react`, `sonner`, `lucide-react`.
- **Backend:** Python 3.12/3.14, FastAPI, Uvicorn, Supabase Python Client (PostgREST + Gotrue + Storage), SlowAPI.
- **Database & Storage:** Hosted Supabase PostgreSQL instance with Supabase Storage public bucket `images`.

---

## 3. Key Constraints & Database Invariants

> **Important:**
> **No Dashboard / Zero-Migration Policy:**
> Database operations must strictly comply with the existing Postgres schema. No manual SQL migrations or dashboard interventions are required.

### Critical Database Constraints:
1. **`project_needs_status_check`:**
   - Allowed values: `'open'` or `'filled'`.
   - Any attempt to insert or update `status = 'claimed'` or other custom statuses triggers a database check violation error (`code 23514`).
   - *Architecture Solution:* When a contributor submits work for review via `POST /projects/{id}/needs/{need_id}/submit-work`, the need remains `'open'`, while the review submission is recorded in `tolken_ledger` (linking `recipient_id` to the escrowed bounty) and an in-project notification comment is created. When the project owner accepts the work via `POST /projects/{id}/needs/{need_id}/confirm-work`, the need status is updated to `'filled'` and the Tolken bounty is released to the contributor.
2. **Tolken Escrow Guarantee:**
   - When a project with escrowed needs is deleted via `DELETE /projects/{id}`, any active unreleased bounties held in escrow are automatically refunded to the owner's balance before the project record is purged.

---

## 4. Completed Workflows & Feature Inventory

### 4.1. Work Submission & Bounty Completion (Begin -> End)
1. **Bounty Need Creation:** An owner creates a need with a Tolken bounty; the Tolken amount is deducted and held in escrow (`status = 'open'`).
2. **Work Submission:** Any logged-in member or contributor clicks **"Submit Work for Review"** on the bounty card.
   - Endpoint: `POST /projects/{id}/needs/{need_id}/submit-work`
   - Records contributor claim in `tolken_ledger` without violating the DB check constraint.
   - Posts a visible notification comment on the project page.
3. **Owner Review & Release:** The project owner sees **"Review & Release Bounty"**. Clicking it confirms completion.
   - Endpoint: `POST /projects/{id}/needs/{need_id}/confirm-work`
   - Transitions `project_needs.status` to `'filled'`.
   - Releases the escrowed Tolken tokens to the contributor's account balance.
   - Triggers an instant toast and balance update.

### 4.2. Image Upload System (Profile, Projects & Ideas)
- **Component:** `frontend/components/forms/ImageUploader.tsx`
- **Endpoint:** `POST /api/v1/upload/image`
  - Validates MIME types (PNG, JPEG, WebP, GIF, SVG) and enforces an 8MB size limit.
  - Automatically stores files in Supabase Storage bucket `images` under a user-scoped directory (`images/{user_id}/{uuid}.{ext}`).
  - Returns permanent public CDN URL.
- **Surfaces:**
  - **New Idea/Project Post (`frontend/components/forms/PostForm.tsx`):** Drag-and-drop or file upload for project/idea covers.
  - **Edit Project (`frontend/components/project/ProjectView.tsx`):** Update or replace cover banner image.
  - **Profile Avatar (`frontend/components/profile/ProfileView.tsx`):** Circular avatar upload with live preview and removal.
  - **URL Fallback:** Supports pasting external URLs if the user prefers.

### 4.3. In-Context Project Lifecycle & Deletions
- **Edit Project / Idea:** Project owners can click the pencil icon next to the title to open `EditProjectDialog`, editing title, summary/caption, stage (`idea`, `building`, `shipped`), cover art, README markdown, repository URL, demo URL, and tags.
  - Endpoint: `PATCH /projects/{id}`
- **Delete Project / Idea:** Owners can safely delete projects via a double-confirmation modal. Escrowed bounties are returned to owner.
  - Endpoint: `DELETE /projects/{id}`
- **Delete Comments:** Comment authors and project owners can delete comments directly with trash button.
  - Endpoint: `DELETE /projects/{id}/comments/{comment_id}`
- **Edit & Delete Needs:** Owners can add, edit, or delete individual needs and bounties on the fly.
  - Endpoints: `POST /projects/{id}/needs`, `PATCH /projects/{id}/needs/{need_id}`, `DELETE /projects/{id}/needs/{need_id}`

### 4.4. "Shipped" Projects Section
- Projects can be transitioned to `"shipped"` via the edit dialog or results view.
- The Explore page (`frontend/components/explore/ExploreGrid.tsx`) features a dedicated **"Shipped"** filter tab, highlighting completed and launched builds.

### 4.5. Collaboration & Team Management
- **In-Context Requests:** Pending collaboration requests appear prominently in a callout banner on the project's Needs tab.
- **Accept/Decline:** The owner can accept or decline contributors with one click.
  - Endpoints: `GET /projects/{id}/collab-requests`, `POST /collab-requests/{id}/respond`
- **Start Building Trigger:** On check results (`frontend/components/checks/ResultsView.tsx`), clicking **"Start building"** actively patches the stage from `idea` to `building` and navigates to the project workspace.

### 4.6. Messaging & Direct Project Invites
- When a user receives an invitation message (`"invite"`), the inbox (`frontend/components/inbox/Messages.tsx`) renders an interactive invitation card.
- Clicking **"Accept Invite & Start Working"** calls `POST /messages/{id}/accept-invite`, adding the user to `project_members` and sending an automated confirmation message back to the thread.

### 4.7. Notifications Hub
- **Location:** In the Inbox page under the **"Alerts"** tab (`frontend/components/inbox/InboxView.tsx`).
- **Endpoint:** `GET /me/notifications`
- Aggregates:
  - Stars on viewer's projects
  - Comments on viewer's projects
  - New profile followers
  - Funded and released Tolken bounties

### 4.8. Social Bounty Sharing
- Every open bounty card includes a **"Share Bounty"** button.
- Generates a deep link with query parameter `?bounty={need_id}`.
- Visiting the deep link automatically selects the "Needs" tab, scrolls to the targeted bounty, and highlights it with a temporary pulse effect.

### 4.9. Simplified Swaps & Custom 2-Way Swaps
- **Ring Explainer:** Visual badge clarifying how collaborative skill swaps flow.
- **Custom Swaps:** In the Inbox, users can propose a custom 2-way swap with any collaborator.
  - Endpoint: `POST /cycles/custom-swap`

### 4.10. Scrollbar & UI Polish
- Unwanted horizontal and vertical scrollbars across Chrome, Edge, Safari, and Windows desktop were removed from:
  - Tab navigation strips (`[role="tablist"]`, `[data-slot="tabs-list"]`)
  - Filter button rows in Explore and Inbox
  - Edit dialogs, modals, and popup overlays (`[role="dialog"]`, `[data-slot="dialog-content"]`)
  - Multi-line textareas (README, Caption, Bio)
- Scrolling behavior remains 100% functional via mouse wheel, trackpad, and touch.

---

## 5. API Reference Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/upload/image` | Upload local image (PNG, JPEG, WebP, GIF, SVG <= 8MB) | Yes |
| `PATCH` | `/api/v1/projects/{id}` | Update title, caption, stage, cover, readme, tags, urls | Yes (Owner) |
| `DELETE` | `/api/v1/projects/{id}` | Delete project & refund escrowed bounties | Yes (Owner) |
| `POST` | `/api/v1/projects/{id}/needs/{need_id}/submit-work` | Submit work for bounty review | Yes |
| `POST` | `/api/v1/projects/{id}/needs/{need_id}/confirm-work` | Confirm work & release Tolken bounty | Yes (Owner) |
| `PATCH` | `/api/v1/projects/{id}/needs/{need_id}` | Edit note or bounty amount | Yes (Owner) |
| `DELETE` | `/api/v1/projects/{id}/needs/{need_id}` | Remove need | Yes (Owner) |
| `GET` | `/api/v1/projects/{id}/collab-requests` | List collab requests for project | Yes (Owner) |
| `POST` | `/api/v1/collab-requests/{id}/respond` | Accept or decline collab request | Yes (Owner) |
| `DELETE` | `/api/v1/projects/{id}/comments/{comment_id}` | Delete comment | Yes (Author/Owner) |
| `POST` | `/api/v1/messages/{id}/accept-invite` | Accept project invite from direct message | Yes |
| `GET` | `/api/v1/me/notifications` | Aggregate activity alerts | Yes |
| `POST` | `/api/v1/cycles/custom-swap` | Propose custom 2-way skill swap | Yes |

---

## 6. Local Setup & Running Guide

### 6.1. Environment Configuration

#### Backend (`backend/.env`):
```env
SUPABASE_URL=https://bcjrztgtveramgvekhwu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>
TOLKEN_STARTING_BALANCE=100
```

#### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://bcjrztgtveramgvekhwu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_API_URL=http://localhost:8010/api/v1
```

### 6.2. Starting the Servers

#### Backend (FastAPI on Port 8010):
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8010 --reload
```

#### Frontend (Next.js on Port 3000 / 3002):
```powershell
cd frontend
npm run dev
```

> **Note:**
> The backend CORS configuration allows `http://localhost:3000`, `3001`, `3002`, `3003`, and matches any localhost/127.0.0.1 port via regex. Sign-in and API calls work seamlessly regardless of which local port Next.js binds to.

### 6.3. Running Verification Checks
- **TypeScript:** `npm --prefix frontend run build` (or `npx tsc --noEmit`) -> 0 errors.
- **ESLint:** `npm --prefix frontend run lint` -> 0 errors.
- **Python Syntax:** `python -m py_compile backend/app/main.py backend/app/routers/*.py` -> 0 errors.

---

## 7. Recommended Next Steps / Roadmap

1. **Email / Push Notifications:** Currently notifications are in-app via `GET /me/notifications`. Connecting Resend or WebPush could alert users when offline.
2. **Tolken Micro-Tipping:** Allow users to tip Tolkens directly on insightful comments or projects outside formal bounties.
3. **Multi-File Image Carousel:** Extend `ImageUploader` to support multi-image galleries on project READMEs and showcase tabs.
4. **Automated CI/CD:** Add GitHub Actions workflow executing `npx tsc --noEmit` and `pytest` on push to `main`.
