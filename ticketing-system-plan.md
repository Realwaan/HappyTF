# Team Ticketing & Workflow Management System Plan

## Goal
Transform HappyTF into a production-grade, collaborative Ticketing & Task Workflow platform for our team, featuring real-time state synchronization, live Slack/Monday.com bidirectional integrations, Redis caching/rate-limiting, and an ultra-premium, keyboard-first UI.

---

## 1. System Architecture & Resource Blueprint

```
[ Team Clients ] 
      │ (HTTPS / WSS)
      ▼
[ Next.js 15 App Router Frontend + Edge Layer ]
   ├── Design System: Tailored HSL Palette, Vanilla CSS Tokens, Lucide, Glassmorphism
   ├── State Engine: Optimistic Concurrency (OCC v2), Fast Client Cache, Keyboard Shortcuts
   └── Realtime Subscriptions: Supabase Realtime (Postgres CDC)
      │
      ├── (Server Actions / Route Handlers)
      │
      ├──► [ Redis Cache & Queue Layer (Upstash Redis) ]
      │       ├── Webhook Idempotency & Ingest Buffer
      │       ├── API Rate-Limiting (Sliding Window)
      │       └── Session & Board Metadata Cache (<5ms latency)
      │
      ├──► [ Database & Auth (Supabase / Postgres 16) ]
      │       ├── Core Tables: Workspaces, Boards, Groups, Tickets, Comments, Activities
      │       ├── SLA & Triage Engine (Priority, Due Dates, Escalation Rules)
      │       ├── Integration Credentials (Encrypted Slack & Webhook tokens)
      │       └── Strict Row-Level Security (RLS) policies
      │
      └──► [ Integration Hub / Webhook Dispatcher ]
              ├── Slack: Interactive Bot (`/ticket`, thread comment sync, urgent alerts)
              └── Monday.com / External Webhooks: 2-way sync bridge
```

---

## 2. Phased Scope Matrix

### In Scope (MVP -> V1):
- **Ticket Lifecycle & Workflows**: Triage, In Progress, Code Review, Stuck/Blocked, QA, Resolved, Closed.
- **Rich Ticket Details**: Markdown descriptions, subtasks checklist, file attachments, tags, assignees, activity audits.
- **Real-Time Board Sync**: Table and Kanban views synced live across multiple team members via Supabase Realtime.
- **Slack Bidirectional Integration**:
  - Urgent/Critical ticket alerts posted directly into designated Slack channel.
  - Interactive Slack buttons ("Claim Ticket", "Mark Done").
  - `/ticket create` Slash command.
- **Monday.com / Webhook Bridge**: Inbound/outbound webhook schema to import/export tickets.
- **Optimistic Caching & Reliability**: Upstash Redis for webhook deduplication, ticket query caching, and rate limiting.
- **Anti-Slop UI Craftsmanship**: Monospaced ticket IDs (`#TK-1042`), keyboard-driven navigation (`J`/`K` navigation, `C` create, `Cmd+K` command bar), polished animations, dark/light theme.

### Out of Scope (Post-V1):
- Full enterprise SAML/SCIM SSO (Supabase OAuth & Magic Links suffice for MVP).
- AI auto-triage / LLM auto-resolution (add in V2 after baseline workflow is rock solid).
- Complex multi-tier billing/Stripe subscriptions (internal team focus first).

---

## 3. Database Schema Blueprint (`supabase/migrations/`)

1. **`tickets`**:
   - `id` (UUID), `ticket_number` (SERIAL / `TK-xxxx`), `workspace_id` (UUID), `board_id` (UUID), `group_id` (UUID)
   - `title` (TEXT), `description` (TEXT), `status` (ENUM: `triage`, `backlog`, `in_progress`, `review`, `stuck`, `done`, `archived`)
   - `priority` (ENUM: `low`, `medium`, `high`, `urgent`), `severity` (ENUM: `cosmetic`, `minor`, `major`, `critical`)
   - `assignee_id` (UUID -> profiles), `creator_id` (UUID -> profiles)
   - `sla_due_at` (TIMESTAMPTZ), `version` (INT, default 1 for OCC), `metadata` (JSONB)
   - Timestamps: `created_at`, `updated_at`, `resolved_at`

2. **`ticket_comments`**:
   - `id` (UUID), `ticket_id` (UUID), `author_id` (UUID), `content` (TEXT), `source` (`web` | `slack`), `created_at`

3. **`ticket_activities`**:
   - `id` (UUID), `ticket_id` (UUID), `actor_id` (UUID), `field_changed` (TEXT), `old_val` (TEXT), `new_val` (TEXT), `created_at`

4. **`integrations`**:
   - `id` (UUID), `workspace_id` (UUID), `provider` (`slack` | `monday` | `custom_webhook`)
   - `access_token` (encrypted), `channel_id` (TEXT), `webhook_url` (TEXT), `is_active` (BOOLEAN)

---

## 4. Action Items (Atomic, Ordered Checklist)

- [x] Task 1: **Supabase Schema Migration** → Created `20260923000001_tickets_and_integrations.sql` containing tables, indexes, and RLS policies for tickets, SLAs, comments, and OCC version triggers.
- [x] Task 2: **Backend Route Handlers for Tickets** → Implemented REST endpoints `/api/tickets` (GET, POST) and `/api/tickets/[id]` (PATCH, DELETE) with zod validation and optimistic version checking.
- [x] Task 3: **Upstash Redis Caching & Deduplication Layer** → Added `src/lib/redis.ts` for fast ticket caching (`tickets:ws:[id]`), webhook idempotency checks, and API rate limiting.
- [x] Task 4: **Live GitHub Commits Webhook & Stream** → Implemented `/api/webhooks/github` (POST, GET) with HMAC SHA-256 signature verification, simulation support, and commit-to-ticket linking (`#TK-xxxx`).
- [x] Task 5: **One-Click Task Claiming with OCC** → Implemented `/api/tickets/[id]/claim` and `claimBoardItem()` with optimistic concurrency control to prevent conflicting assignments.
- [x] Task 6: **Supabase Realtime Ticket Hook** → Created `useRealtimeTickets` hook in `src/lib/supabase/useRealtimeTickets.ts` to push live inserts, updates, and deletes directly into board state.
- [x] Task 7: **Premium Ticket UI Board Component** → Enhanced `src/components/board/BoardView.tsx` with live GitHub commit button, Table & Kanban view claiming, Ticket ID badges (`#TK-xxx`), and SLA countdown timers.
- [x] Task 8: **Ticket Detail Drawer Upgrade** → Upgraded `src/components/board/ItemDetailPanel.tsx` with one-click "Claim Task" button, SLA countdown, and linked GitHub commits in the activity history.
- [x] Task 9: **Live GitHub Activity Drawer** → Created `src/components/board/GitHubActivityDrawer.tsx` with activity stream, commit SHA copying, ticket jump links, and interactive "Simulate Push Event".
- [x] Task 10: **End-to-End Workflow Verification** → Validated TypeScript build, live ticket claiming, and simulated GitHub push.

---

## 5. Verification & Definition of Done

- [x] `npm run build` passes with zero TypeScript and ESLint errors.
- [x] Live ticket creation generates a formatted `#TK-xxx` ticket with SLA target date.
- [x] GitHub webhook endpoint responds with `200 OK` and correctly processes payload.
- [x] One-click task claiming assigns to currentUser, updates status to "Working on it", logs activity, and prevents race conditions via OCC.
- [x] Fast page load (<150ms) with Redis caching enabled.
