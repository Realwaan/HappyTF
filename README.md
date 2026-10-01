# HappyTF

High-performance, collaborative team workspace, task workflow, and ticketing platform built with Next.js 15 (App Router), React 19, Supabase, TypeScript, and Vitest.

---

## Features

- **Ultra-fast Kanban & Table Boards**: Real-time collaborative task tracking.
- **Optimistic Concurrency Control (OCC v2)**: Sub-millisecond local state updates with server-side version collision safety.
- **Team Communications**: Workspace-scoped team channels, threaded comments, and reactions.
- **Multi-Tenant Security**: Strict PostgreSQL Row-Level Security (RLS) with non-recursive membership helper functions.
- **Command Palette & Keyboard Navigation**: `Cmd+K` / `Ctrl+K`, quick filters, and navigation shortcuts.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React Server Components)
- **Library**: [React 19](https://react.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 16, RLS, Realtime CDC)
- **Styling**: Vanilla CSS Design Tokens (documented in [`DESIGN.md`](./DESIGN.md))
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Icons**: Lucide React

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite
```bash
npm test
```
All unit and OCC concurrency tests run via Vitest.
