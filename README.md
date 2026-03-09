# DispatchLite

DispatchLite is a field-service dispatch demo app with three authenticated personas:

- **Dispatcher**: triages all jobs, assigns requested jobs, updates status, and adds notes
- **Technician**: sees assigned jobs only and can mutate assigned jobs only
- **Client**: creates new service requests and tracks only their own requests

The system includes:

- role-based access control at API layer
- realtime updates via Socket.IO (`job:updated`, `job:event`)
- Postgres-backed append-only timeline (`job_events`) plus current-state snapshot (`jobs`)

## Stack

- Monorepo with npm workspaces
- API: Express + TypeScript + `pg` + Socket.IO
- Web: React + Vite + TypeScript + Tailwind CSS
- Shared package: domain and socket event contracts
- DB: Postgres 16 via Docker Compose

## Workspace layout

- `apps/api` — backend API and realtime server
- `apps/web` — frontend UI (dispatcher, technician, client)
- `packages/shared` — cross-app type contracts
- `db/init` — SQL init scripts (`extensions`, `schema`, `seed`)
- `compose.yaml` — Postgres container and healthcheck

## Core flows

### Client request flow

1. Client creates request: `POST /api/jobs/requests`
2. Job is created as:
   - `current_status='requested'`
   - `assigned_technician_id=NULL`
   - `requested_by_user_id=<client user>`
3. Dispatcher sees requested jobs and assigns one:
   - `PATCH /api/jobs/:jobId/assign`
4. Assignment transitions job to `scheduled`
5. Technician sees newly assigned job

### Existing mutation flow

- Dispatcher and assigned technicians can still:
  - `PATCH /api/jobs/:jobId/status`
  - `POST /api/jobs/:jobId/notes`

## API endpoints (current)

- `GET /api/health`
- `GET /api/me`
- `GET /api/technicians`
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `POST /api/jobs/requests` (client-only)
- `PATCH /api/jobs/:jobId/assign` (dispatcher-only)
- `PATCH /api/jobs/:jobId/status`
- `POST /api/jobs/:jobId/notes`

## Quickstart

1. Install dependencies:
   - `npm install`
2. Reset/start DB:
   - `npm run reset:db`
3. Start API:
   - `npm --workspace apps/api run dev`
4. Start web:
   - `npm --workspace apps/web run dev`
5. Open app:
   - `http://localhost:5173`

## App views

Hash routes in the web app:

- `#dispatcher` — dispatcher workspace
- `#technician` — technician workspace
- `#client` — authenticated client workspace

Examples:

- `http://localhost:5173/#dispatcher`
- `http://localhost:5173/#technician`
- `http://localhost:5173/#client`

## Demo tokens

Bearer tokens:

- Dispatcher: `demo-dispatcher-token`
- Ava tech: `demo-ava-token`
- Ben tech: `demo-ben-token`
- Client 1: `demo-client-1-token`
- Client 2: `demo-client-2-token`

Quick token switch in browser console:

- `localStorage.setItem("dispatchlite_bearer_token", "demo-client-1-token"); location.reload();`

Note: creating job requests requires a **client token**. If you use dispatcher/tech token, `POST /api/jobs/requests` correctly returns 403.

## Database scripts

- `npm run start:db`
- `npm run stop:db`
- `npm run reset:db`

### Important init caveat

`db/init` scripts run only when Postgres data directory is empty.  
If schema/seed changed, run:

- `npm run reset:db`

## Build checks

- API:
  - `npm --workspace apps/api run build`
- Web:
  - `npm --workspace apps/web run build`

## Smoke testing

Use:

- `SMOKE_TESTS.md`

This runbook now includes client request -> dispatcher assign -> technician visibility checks.

## Known operational notes

- If API port `3001` is in use, run:
  - `PORT=3101 npm --workspace apps/api run dev`
  - `VITE_API_BASE_URL=http://localhost:3101 npm --workspace apps/web run dev`
- Realtime subscriptions require valid bearer token and permission checks on subscribe.
