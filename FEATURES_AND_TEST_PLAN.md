# SalesPulse — Complete Feature Inventory & Automated Test Plan

## Part 1: Complete Feature Inventory

> Every feature below was identified by auditing the actual source code: pages, API routes, services, hooks, and database models. This is not a wishlist — it's what the codebase currently implements.

---

### 🔐 A. Authentication & Access Control (5 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| A1 | **Email/Password Login** | `src/app/login/page.tsx` | ✅ Firebase Auth |
| A2 | **Google OAuth Login** | `src/app/login/page.tsx` | ✅ Firebase Auth |
| A3 | **Auth State Persistence** | `src/lib/hooks/useAuth.ts` | ✅ `onAuthStateChanged` |
| A4 | **Redirect unauthenticated users to /login** | `src/components/layout/Sidebar.tsx` | ✅ Client-side |
| A5 | **Auto-create user profile on first Google login** | `src/app/login/page.tsx` L52-62 | ✅ Sets `role: 'manager'` |

---

### 📊 B. Manager Dashboard — `/dashboard` (8 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| B1 | **KPI Cards** — Total Team Calls, Team Avg Score, Top Performer | `src/app/dashboard/page.tsx` | ✅ Live from Prisma |
| B2 | **Rep Ranking Table** — Sorted by avg score, with progress bars | `dashboard/page.tsx` L340-436 | ✅ |
| B3 | **Proficiency Bar Chart** — placeholder for future data | `dashboard/page.tsx` L143 + `MetricBarChart.tsx` | ⚠️ Empty data |
| B4 | **Add Representative Dialog** — Creates rep via `POST /api/reps` | `dashboard/page.tsx` L116-133 | ✅ |
| B5 | **Edit Representative Dialog** — Renames rep via `PUT /api/reps/:email` | `dashboard/page.tsx` L84-99 | ✅ |
| B6 | **Delete Representative Dialog** — Removes rep via `DELETE /api/reps/:email` | `dashboard/page.tsx` L101-114 | ✅ |
| B7 | **Click row → Navigate to rep profile** `/reps/:email` | `dashboard/page.tsx` L359 | ✅ |
| B8 | **"Review Recordings" → Navigate to Sync page** | `dashboard/page.tsx` L161 | ✅ |

---

### 🔄 C. Fireflies Sync Pipeline — `/dashboard/sync` (13 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| C1 | **Sync Transcripts from Fireflies API** | `sync/page.tsx` → `GET /api/sync/fireflies` | ⚠️ Saves to **Firestore** `synced_calls` |
| C2 | **Call Type Classification** — Evaluation / Follow-up / Other via keyword matching | `sync/page.tsx` L232-241 | ✅ Client-side |
| C3 | **Call Type Filter Tabs** — Filter by Call 1, Call 2, Other, All | `sync/page.tsx` L468-505 | ✅ |
| C4 | **Search bar** — Filter by title, rep email, participant | `sync/page.tsx` L382-391 | ✅ |
| C5 | **Pagination** — 25 rows per page with nav controls | `sync/page.tsx` L134-135 | ✅ |
| C6 | **Analyze Call** — Trigger AI analysis via dropdown → `POST /api/sync/analyze` | `sync/page.tsx` L317-338 | ✅ |
| C7 | **View Transcript Details** — Click row → slide-out panel via `GET /api/sync/transcript` | `sync/page.tsx` L340-355 | ✅ |
| C8 | **Transcript Search** — Highlight matching text within sentences | `sync/page.tsx` L357-372 | ✅ |
| C9 | **People Discovery Panel** — List all unique participants with call counts | `sync/page.tsx` L507-647 | ✅ |
| C10 | **Quick Add Rep from Discovery Panel** | `sync/page.tsx` L616-633 | ⚠️ Writes to **Firestore**, not Prisma |
| C11 | **Sync Stats Banner** — Shows total synced / new calls | `sync/page.tsx` L133 | ✅ |
| C12 | **Last Synced Timestamp** in header | `sync/page.tsx` L129, L425-437 | ✅ |
| C13 | **External Link to Fireflies recording** | `sync/page.tsx` L769 | ✅ |

---

### 📞 D. Call Detail View — `/calls/[callId]` (7 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| D1 | **Fetch call + analysis from Prisma** via `GET /api/calls/:callId` | `calls/[callId]/page.tsx` | ✅ |
| D2 | **Call metadata display** — Title, date, duration, rep, prospect | `calls/[callId]/page.tsx` | ✅ |
| D3 | **AI Analysis Summary** — Outcome, Deal Risk, Script Alignment badges | `calls/[callId]/page.tsx` | ✅ |
| D4 | **Section-by-Section Scoring Accordion** — Expand to see notes per rubric | `calls/[callId]/page.tsx` | ✅ |
| D5 | **Top Coaching Priorities** — Bullet list of AI-generated coaching tips | `calls/[callId]/page.tsx` | ✅ |
| D6 | **Total Score with progress bar** | `calls/[callId]/page.tsx` | ✅ |
| D7 | **Back navigation to dashboard** | `calls/[callId]/page.tsx` | ✅ |

---

### 👤 E. Rep Profile — `/reps/[email]` (4 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| E1 | **Rep info header** — Name, email, total calls, average score | `reps/[email]/page.tsx` | ✅ |
| E2 | **Skill Radar Chart** — Visual breakdown of section scores | `SkillRadar.tsx` | ✅ |
| E3 | **Trend Chart** — Score trend over time | `TrendChart.tsx` | ✅ |
| E4 | **Call History Table** — All calls for this rep, linked to call detail | `reps/[email]/page.tsx` | ✅ |

---

### 📱 F. My Calls — `/my-calls` — Rep Self-Service (3 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| F1 | **List the logged-in rep's own calls** (filtered by `user.email`) | `my-calls/page.tsx` | ✅ |
| F2 | **Display score, outcome, prospect per call** | `my-calls/page.tsx` L86-121 | ✅ |
| F3 | **Link to call detail** `/calls/:id` | `my-calls/page.tsx` L113 | ✅ |

---

### 📚 G. Knowledge Base / RAG — `/knowledge` + `/settings` RAG tab (6 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| G1 | **List all knowledge documents** from PostgreSQL | `GET /api/rag/documents` | ✅ Prisma |
| G2 | **Upload PDF** → R2, extract text, chunk + embed → pgvector | `POST /api/rag/documents` | ✅ |
| G3 | **Delete document** → remove from R2 + Prisma (cascade chunks) | `DELETE /api/rag/documents/:id` | ✅ |
| G4 | **Toggle document active/inactive** | `PUT /api/rag/documents/:id` | ✅ |
| G5 | **Toggle per-agent usage** — `useInCall1`, `useInCall2` toggles | `RAGDocsSection.tsx` | ✅ |
| G6 | **RAG context injection during AI analysis** — injected into Gemini prompt | `gemini.ts` | ✅ |

---

### ⚙️ H. Settings Page — `/settings` (7 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| H1 | **Data Pipeline tab** — Auto-Analysis toggle, Daily Sync toggle + time, Webhook URL, ClickUp List ID, Message Template | `settings/page.tsx` | ⚠️ Saves to **Firestore** |
| H2 | **Routing Rules** — Evaluation / Follow-up / Excluded keywords, Fallback Agent | `settings/page.tsx` L271-334 | ⚠️ Firestore |
| H3 | **RAG Documents tab** — Renders `<RAGDocsSection />` | `settings/page.tsx` L341-343 | ✅ Prisma |
| H4 | **Agent Prompts tab** — 3 placeholder prompt cards (not yet functional) | `settings/page.tsx` L349-371 | ⚠️ Static UI |
| H5 | **Model Configuration tab** — AI model selector (Gemini variants) | `settings/page.tsx` L373-468 | ⚠️ Firestore |
| H6 | **QA Debugger tab** — Renders `<QASection />` | `settings/page.tsx` L345-347 | ✅ |
| H7 | **Database Seed utility** (Dev Only) | `settings/page.tsx` L449-465 | ⚠️ Seeds Firestore |

---

### 🤖 I. Backend Services & API Routes (23 features)

| # | Feature | Route / File | Status |
|---|---------|-------------|--------|
| I1 | `GET /api/reps` — List all reps from Prisma | `api/reps/route.ts` | ✅ |
| I2 | `POST /api/reps` — Create a new rep | `api/reps/route.ts` | ✅ |
| I3 | `GET /api/reps/:email` — Rep + calls + analyses | `api/reps/[email]/route.ts` | ✅ |
| I4 | `PUT /api/reps/:email` — Update rep name | `api/reps/[email]/route.ts` | ✅ |
| I5 | `DELETE /api/reps/:email` — Delete rep | `api/reps/[email]/route.ts` | ✅ |
| I6 | `GET /api/calls` — List all calls | `api/calls/route.ts` | ✅ |
| I7 | `GET /api/calls/:callId` — Single call + analysis | `api/calls/[callId]/route.ts` | ✅ |
| I8 | `GET /api/sync/fireflies` — Fetch from Fireflies GraphQL | `api/sync/fireflies/route.ts` | ✅ |
| I9 | `POST /api/sync/analyze` — Trigger AI analysis | `api/sync/analyze/route.ts` | ✅ |
| I10 | `GET /api/sync/transcript?id=` — Full transcript detail | `api/sync/transcript/route.ts` | ✅ |
| I11 | `POST /api/sync` — Server-side bulk sync to Prisma | `api/sync/route.ts` → `syncCalls.ts` | ✅ |
| I12 | `GET /api/rag/documents` — List RAG docs | `api/rag/documents/route.ts` | ✅ |
| I13 | `POST /api/rag/documents` — Upload + process PDF | `api/rag/documents/route.ts` | ✅ |
| I14 | `DELETE /api/rag/documents/:id` — Delete doc + R2 | `api/rag/documents/[id]/route.ts` | ✅ |
| I15 | `PUT /api/rag/documents/:id` — Toggle flags | `api/rag/documents/[id]/route.ts` | ✅ |
| I16 | `GET /api/cron/sync` — Automated sync for CRON | `api/cron/sync/route.ts` | ✅ |
| I17 | `POST /api/clickup/task` — Send ClickUp notification | `api/clickup/task/route.ts` | ✅ |
| I18 | `GET /api/settings/prompts` — Load prompt settings | `api/settings/prompts/route.ts` | ✅ |
| I19 | `POST /api/settings/prompts` — Save prompt settings | `api/settings/prompts/route.ts` | ✅ |
| I20 | **Orchestrator** — Full end-to-end pipeline: fetch → classify → analyze → save → notify ClickUp | `orchestrator.ts` | ✅ |
| I21 | **Gemini AI Analysis** — Structured scoring with RAG context | `gemini.ts` | ✅ |
| I22 | **ClickUp Direct API v3** — Send markdown to ClickUp chat | `clickup.ts` | ✅ |
| I23 | **ClickUp Template Engine** — `{{rep}}`, `{{score}}`, etc. substitution | `clickup.ts` L59-110 | ✅ |

---

### 🧭 J. Navigation & Layout (4 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| J1 | **Sidebar** — Collapsible, role-based sections (Manager vs Rep) | `Sidebar.tsx` | ✅ |
| J2 | **Header with breadcrumbs** | `Header.tsx` | ✅ |
| J3 | **Sign Out** | `Sidebar.tsx` | ✅ |
| J4 | **Root `/` redirects to `/dashboard`** | `page.tsx` | ✅ |

---

### 🗄️ K. Database & Infrastructure (4 features)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| K1 | **PostgreSQL with pgvector** on Render | `prisma/schema.prisma` | ✅ |
| K2 | **5 Prisma models**: Rep, Call, Analysis, KnowledgeDocument, KnowledgeChunk, Setting | `schema.prisma` | ✅ |
| K3 | **R2 Object Storage** for PDF files | `@aws-sdk/client-s3` | ✅ |
| K4 | **Render Blueprint IaC** — `render.yaml` | `render.yaml` | ✅ |

---

### ⚠️ L. Known Issues — Firestore Holdovers (3 issues)

| # | Issue | Impact |
|---|-------|--------|
| L1 | **Settings page** reads/writes pipeline config to **Firestore**, not Prisma `Setting` table | Settings won't persist on Render without Firebase env vars |
| L2 | **Sync page** reads/writes `synced_calls` to **Firestore**, not Prisma `Call` table | Duplicate data stores |
| L3 | **Sync page "Add Rep"** button writes to **Firestore** `reps` collection, not Prisma | Rep won't appear in dashboard |

---
---

## Part 2: Automated Test Plan

> This test plan is designed to be executed automatically using browser automation.
> Each test has a clear pass/fail condition. Tests are ordered by dependency.

### Prerequisites
- App is running (either locally via `npm run dev` or on Render)
- PostgreSQL database is accessible and schema is pushed via `prisma db push`

---

### Test Suite 1: Infrastructure Health (5 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T1.1 | **API Health — Reps** | `GET /api/reps` | Returns 200 + JSON array |
| T1.2 | **API Health — Calls** | `GET /api/calls` | Returns 200 + JSON array |
| T1.3 | **API Health — RAG Documents** | `GET /api/rag/documents` | Returns 200 + JSON array |
| T1.4 | **API Health — Cron Sync** | `GET /api/cron/sync` | Returns 200 |
| T1.5 | **API Health — Settings Prompts** | `GET /api/settings/prompts` | Returns 200 + JSON |

---

### Test Suite 2: Authentication (3 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T2.1 | **Login page loads** | Browser → `/login` | "SalesPulse" title + email field visible |
| T2.2 | **Invalid login shows error** | Submit with bad credentials | Error message appears |
| T2.3 | **Root redirects** | Browser → `/` | Redirects to `/dashboard` or `/login` |

---

### Test Suite 3: Dashboard — Manager (7 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T3.1 | **Dashboard loads** | Browser → `/dashboard` | "Team Overview" heading visible |
| T3.2 | **KPI cards render** | Check DOM | 3 KPI cards present |
| T3.3 | **Rep table renders** | Check DOM | Table with columns: Rank, Representative, Calls, Avg Score, Status |
| T3.4 | **Add Rep dialog opens** | Click "Add Representative" | Dialog appears with Email + Name fields |
| T3.5 | **Add Rep submits** | Fill email + name → submit | POST `/api/reps`, dialog closes |
| T3.6 | **Rep row click navigates** | Click on a rep row | URL changes to `/reps/:email` |
| T3.7 | **Review Recordings navigates** | Click "Review Recordings" | URL changes to `/dashboard/sync` |

---

### Test Suite 4: Fireflies Sync Pipeline (6 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T4.1 | **Sync page loads** | Browser → `/dashboard/sync` | "Fireflies Pipeline" heading visible |
| T4.2 | **Call filter tabs render** | Check DOM | 4 tabs: Call 1, Call 2, Other, All Calls |
| T4.3 | **Search input works** | Type in search field | Table rows filter in real-time |
| T4.4 | **Sync button triggers API** | Click "Sync Transcripts" | Loading spinner appears |
| T4.5 | **Analyze dropdown renders** | Click "Analyze" on unanalyzed call | Dropdown shows Evaluation + Follow-up |
| T4.6 | **People Discovery Panel toggles** | Click "People on Calls" | Panel expands/collapses |

---

### Test Suite 5: Call Detail (5 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T5.1 | **Call detail page loads** | Browser → `/calls/:validId` | Call title + metadata visible |
| T5.2 | **Analysis sections render** | Check DOM | Accordion items with section scores |
| T5.3 | **Coaching priorities display** | Check DOM | Bullet list of coaching tips |
| T5.4 | **Score badge shows** | Check DOM | Total score with color coding |
| T5.5 | **Invalid call ID → graceful error** | Browser → `/calls/nonexistent` | Error message, no crash |

---

### Test Suite 6: Rep Profile (5 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T6.1 | **Rep profile loads** | Browser → `/reps/:validEmail` | Rep name + email displayed |
| T6.2 | **Skill Radar chart renders** | Check DOM | Canvas or SVG element |
| T6.3 | **Trend chart renders** | Check DOM | Canvas or SVG element |
| T6.4 | **Call history table renders** | Check DOM | Table with call rows |
| T6.5 | **Invalid email → graceful** | Browser → `/reps/fake@email.com` | Loading or "no data" state |

---

### Test Suite 7: Knowledge Base / RAG (6 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T7.1 | **Knowledge page loads** | Browser → `/knowledge` | "Knowledge Base" heading visible |
| T7.2 | **Document list fetches from API** | `GET /api/rag/documents` | Returns array |
| T7.3 | **Upload UI renders** | Check DOM | Upload button visible |
| T7.4 | **Settings RAG tab renders** | `/settings` → click "RAG Documents" tab | Document list visible |
| T7.5 | **Toggle document active flag** | Click toggle on a doc | PUT request sent |
| T7.6 | **Delete document** | Click delete on a doc | DELETE request sent |

---

### Test Suite 8: Settings (7 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T8.1 | **Settings page loads** | Browser → `/settings` | "System Configuration" heading visible |
| T8.2 | **All 5 tabs render** | Check DOM | Pipeline, RAG Docs, Agent Prompts, Model Config, QA Debugger |
| T8.3 | **Auto-Analysis toggle** | Toggle switch | State changes |
| T8.4 | **Keyword inputs editable** | Type in Evaluation Keywords | Value updates |
| T8.5 | **ClickUp template editable** | Type in template textarea | Value updates |
| T8.6 | **AI model selector** | Open dropdown | Shows Gemini model options |
| T8.7 | **Save Changes** | Click Save | Spinner → success alert |

---

### Test Suite 9: CRUD API Validation (7 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T9.1 | **Create Rep** | `POST /api/reps` `{email, name}` | 200 + rep object |
| T9.2 | **Read Rep** | `GET /api/reps/:email` | 200 + rep with calls |
| T9.3 | **Update Rep** | `PUT /api/reps/:email` `{name}` | 200 + updated rep |
| T9.4 | **Delete Rep** | `DELETE /api/reps/:email` | 200 + success |
| T9.5 | **Upload RAG Doc** | `POST /api/rag/documents` (FormData w/ PDF) | 200 + document |
| T9.6 | **Toggle RAG Doc** | `PUT /api/rag/documents/:id` `{isActive: false}` | 200 + updated doc |
| T9.7 | **Delete RAG Doc** | `DELETE /api/rag/documents/:id` | 200 + success |

---

### Test Suite 10: Navigation & Layout (4 tests)

| Test ID | Test Name | Method | Pass Condition |
|---------|-----------|--------|----------------|
| T10.1 | **Sidebar renders** | Check DOM on any page | Sidebar nav links visible |
| T10.2 | **Sidebar collapse/expand** | Click collapse button | Toggles between full and icon-only |
| T10.3 | **All nav links work** | Click each link | Correct page loads |
| T10.4 | **Breadcrumbs display** | Check header | Text matches current page |

---

## Execution Strategy

**Recommended execution order:**
1. Start with **Suite 1** (API health — no browser needed)
2. Then **Suite 9** (CRUD tests to seed data for UI tests)
3. Then **Suites 2–8, 10** (UI tests with browser)

**For each browser test:**
- Navigate to the target URL
- Wait for loading states to resolve
- Check for the specified DOM elements
- Capture a screenshot as evidence
- Report pass/fail with screenshot path

---

**Total: 84 features documented | 49 automated tests planned**
