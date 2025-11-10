# TaskFlow – Collaborative Task Management Platform

TaskFlow is a full-stack, real-time task management platform inspired by Superlist. It enables individuals and teams to create workspaces, manage tasks, collaborate, and leverage AI-assisted productivity features.

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Core Features](#core-features)  
3. [Architecture & Tech Stack](#architecture--tech-stack)  
4. [Project Structure](#project-structure)  
5. [Prerequisites](#prerequisites)  
6. [Environment Variables](#environment-variables)  
7. [Local Development Setup](#local-development-setup)  
8. [Running the Application](#running-the-application)  
9. [Database & Supabase Configuration](#database--supabase-configuration)  
10. [Available Scripts](#available-scripts)  
11. [Testing & Linting](#testing--linting)  
12. [Deployment Guide (Render)](#deployment-guide-render)  
13. [Troubleshooting](#troubleshooting)  
14. [Roadmap Ideas](#roadmap-ideas)  
15. [License](#license)

---

## Project Overview

TaskFlow combines an intuitive React interface with a robust Express/Prisma backend to deliver a cohesive productivity experience:

- Maintain multiple **workspaces** with custom lists and tags.
- Track **tasks** (including subtasks) with statuses, priorities, due dates, attachments, and activity history.
- Collaborate using **workspace invitations**, role-based permissions, notifications, and real-time updates via WebSockets.
- Boost productivity with **AI integrations** (OpenAI) for task summarization, planning, and prioritization.

---

## Core Features

- **Authentication & Authorization**: JWT-based auth, roles (Owner/Admin/Member/Viewer), fine-grained permissions.  
- **Workspace Management**: Create/manage workspaces, lists, tags, and members with invitations and custom permissions.  
- **Task Management**: Tasks, subtasks, drag-and-drop ordering, comments, attachments, activity timeline.  
- **Quick Views**: Inbox, Today, Upcoming, Assigned To Me, and Global Tasks.  
- **Notifications**: Task assignment notifications with real-time delivery.  
- **Real-Time Collaboration**: WebSocket events keep clients in sync.  
- **AI Features**: Summaries, automatic subtask generation, prioritization suggestions.  
- **Responsive UI**: Mobile-ready navigation (with sheets/drawers), accessible components (Radix UI + Tailwind).  
- **Internationalization**: English & Arabic built in.  
- **Themes**: Light & dark mode toggle.

---

## Architecture & Tech Stack

| Layer      | Technologies |
|------------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter, i18next |
| **Backend**  | Express, TypeScript, Prisma ORM, Zod validation, WebSockets, OpenAI SDK |
| **Database** | PostgreSQL (Supabase) |
| **Tooling**  | ESLint/TypeScript, pnpm/npm, Vite, esbuild, Prisma CLI |

Deployment targets Render (web service) and Supabase (PostgreSQL + pooler).

---

## Project Structure

```
.
├── client/                   # Vite + React SPA
│   ├── src/
│   │   ├── components/       # UI components & feature modules
│   │   ├── contexts/         # React context providers
│   │   ├── hooks/            # Custom hooks
│   │   ├── i18n/             # Localization files
│   │   ├── lib/              # Frontend utilities
│   │   └── pages/            # Routed screens
│   └── index.html
├── server/                   # Express server (API + WebSocket)
│   ├── middleware/           # Auth middleware & helpers
│   ├── services/             # AI integration helpers
│   ├── websocket.ts          # WebSocket manager
│   └── routes.ts             # REST API routes
├── prisma/
│   ├── schema.prisma         # Prisma schema (PostgreSQL)
│   └── migrations/           # Generated Prisma migrations
├── shared/                   # Shared TypeScript/Zod schemas
├── render.yaml               # Render deployment specification
├── SUPABASE_SETUP.md         # Detailed Supabase connection notes
├── package.json              # Unified scripts for server + client
└── README.md                 # You are here
```

---

## Prerequisites

- **Node.js** 20.x (Recommended).  
- **npm** >= 10 (bundled with Node) — project currently uses `npm`.  
- **Git** (to clone the repository).  
- **Supabase Account** (or another PostgreSQL provider).  
- Optional: **OpenAI API key** for AI features.

---

## Environment Variables

Create a `.env` file at the project root. The server (and Prisma) expect the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. Use Supabase **Session Pooler** URL (includes `pooler.supabase.com` and `?pgbouncer=true`).|
| `APP_URL` | ✅ (production) | Base URL of the deployed web app (e.g., `https://taskflow-app.onrender.com`). Used in invitation emails/links. |
| `PORT` | ❌ | Overrides server port (default 5000). Render uses 10000. |
| `NODE_ENV` | ❌ | `development` or `production`. |
| `JWT_SECRET` | ✅ | Secret for signing auth tokens (Render can auto-generate). |
| `SESSION_SECRET` | ✅ | Secondary secret (also for fallback). |
| `OPENAI_API_KEY` | ❌ | Direct key used for AI prompts. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ❌ | Optional override. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | ❌ | Custom OpenAI-compatible endpoint. |

> See `render.yaml` for the full list of env vars used in deployment.  
> Refer to **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** for in-depth DB connection instructions.

---

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/fawaskoya/superlist-clone.git
   cd superlist-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env   # if provided (otherwise create manually)
   ```
   - Fill in the variables listed above.

4. **Set Prisma schema (PostgreSQL)**
   ```bash
   npm run db:generate
   npm run db:push   # or npx prisma migrate deploy
   ```

5. **Seed data (optional)**: If you create a custom seed script, run it here.

---

## Running the Application

### Development (hot reload)
```bash
npm run dev          # Starts Express API (tsx) + Vite client in development mode
```
Navigate to http://localhost:5000 (proxy to Vite dev server, with API served on the same origin).

### Production build
```bash
npm run build        # Builds client (Vite) and bundles server (esbuild)
npm start            # Runs dist/index.js with NODE_ENV=production
```

---

## Database & Supabase Configuration

1. **Create Supabase project** (region of your choice).
2. **Reset the database password** (store in `.env` / Render env var).
3. **Use Connection Pooler (Session mode)**:
   - Supabase Dashboard → Settings → Database → Connection string → `Session pooler`.
   - Copy URI; ensure port `6543` or `5432` with `?pgbouncer=true`.
   - Use the format:  
     `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true`
4. **Allow all IPs** (or Render IP list) in Database → Network Restrictions.
5. **Run migrations** (locally) using `DATABASE_URL` pointing to Supabase (see *Local Development Setup*).
6. More detail: **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run server (tsx) + Vite client in development. |
| `npm run build` | Build client and server bundles. |
| `npm start` | Start production server (`dist/index.js`). |
| `npm run check` | TypeScript type-check. |
| `npm run db:generate` | Generate Prisma client. |
| `npm run db:push` | Push Prisma schema to the database. |
| `npm run db:migrate` | Deploy migrations (Prisma migrate deploy). |

---

## Testing & Linting

- **TypeScript**: `npm run check`
- **Unit/Integration Tests**: *(Not yet configured)*. Recommended tools: Vitest/Jest + React Testing Library.
- **Linting**: ESLint configuration can be added to `package.json` scripts (e.g., `npm run lint`).

---

## Deployment Guide (Render)

### 1. Prepare the repository
- Ensure latest changes are pushed to GitHub (already configured).
- `render.yaml` describes build/start commands and env vars.

### 2. Render setup
1. **Create a Web Service**
   - Dashboard → New → Web Service → Connect Git repository.
   - Pick the repository (`superlist-clone`) and the `main` branch.
2. **Configure build & start**
   - Build command: `npm install --include=dev && cp prisma/schema.postgresql.prisma prisma/schema.prisma && npx prisma generate && npm run build`
   - Start command: `npm start`
3. **Environment variables**  
   Add the same variables from `.env` (Render’s UI respects `render.yaml` but double-check).  
   Key ones:
   - `NODE_ENV=production`  
   - `PORT=10000`  
   - `APP_URL=https://<your-render-service>.onrender.com`  
   - `DATABASE_URL=<Supabase Session Pooler connection string>`  
   - `JWT_SECRET` (Render can auto-generate)  
   - `SESSION_SECRET` (Render can auto-generate)  
   - `OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_API_KEY` (if using AI)  
4. **Deployment**
   - Trigger a manual deploy (or wait for auto-deploy).  
   - Monitor logs; ensure `Prisma` connects successfully to Supabase pooler.
5. **Post-deploy checks**
   - Visit the Render URL to register a user.  
   - Confirm Supabase has the expected tables/data.  
   - Set `APP_URL` (Render environment) to the deployed domain to ensure invitation links work.

### 3. Supabase adjustments for production
- Consider enabling Row Level Security (RLS) if you expose the DB to other clients.  
- Schedule backups and monitor usage quotas.  
- Restrict IPs once Render IPs are known (optional).

---

## Troubleshooting

| Problem | Resolution |
|---------|------------|
| `Can't reach database server` | Ensure Supabase database is running, use Session Pooler URL, allow all IPs. |
| `Authentication failed (Prisma)` | Verify password and project ref in connection string. |
| `Migration provider mismatch` | Delete old SQLite migrations (already done) and run `prisma migrate reset` (with caution). |
| Slow builds on Render | Use Render’s build cache (automatic) and keep dev dependencies trimmed. |
| WebSocket issues | Check Render plan (web service supports WebSockets). Ensure environment uses `0.0.0.0` host and correct port. |
| AI features unavailable | Set `OPENAI_API_KEY` or disable buttons conditionally in UI if the key is missing. |

---

## Roadmap Ideas

- Unit/integration testing (Vitest + React Testing Library, Supertest for Express).  
- Offline/optimistic updates for tasks.  
- Advanced analytics dashboards.  
- Mobile-native wrapper (React Native) leveraging existing API.  
- Email notifications (via Supabase functions or external service).  
- Additional AI workflows (automatic reminders, summaries of comments).  
- Configurable white-label theme support.

---

## License

MIT License © 2025 TaskFlow contributors.

Feel free to fork and adapt the project for your own teams. Contributions and feedback are welcome!

