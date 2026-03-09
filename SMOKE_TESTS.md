# DispatchLite Smoke Test Runbook

This runbook validates the current Client -> Dispatcher -> Technician flow.

## Scope

- DB schema and seed verification
- API auth, read, and write behavior
- RBAC enforcement per role
- Client request creation and dispatcher assignment workflow
- UI sanity checks across all views

## 1) Prerequisites

- Docker is running
- `npm install` completed
- Ports `3001` and `5173` available

Demo bearer tokens:

- Dispatcher: `demo-dispatcher-token`
- Ava technician: `demo-ava-token`
- Ben technician: `demo-ben-token`
- Client 1: `demo-client-1-token`
- Client 2: `demo-client-2-token`

## 2) Start environment

1. `npm run reset:db`
2. `npm --workspace apps/api run dev`
3. `npm --workspace apps/web run dev`

Expected:

- API listens at `http://localhost:3001`
- Web serves at `http://localhost:5173`

## 3) DB checks

Run:

- `docker compose exec -T db psql -U dispatchlite -d dispatchlite -c "SELECT count(*) AS technicians_count FROM technicians;"`
- `docker compose exec -T db psql -U dispatchlite -d dispatchlite -c "SELECT count(*) AS users_count FROM users;"`
- `docker compose exec -T db psql -U dispatchlite -d dispatchlite -c "SELECT count(*) AS jobs_count FROM jobs;"`
- `docker compose exec -T db psql -U dispatchlite -d dispatchlite -c "SELECT count(*) AS job_events_count FROM job_events;"`

Expected minimums:

- technicians >= 2
- users >= 5
- jobs >= 3
- job_events >= 5

Optional schema checks:

- `docker compose exec -T db psql -U dispatchlite -d dispatchlite -c "\d users"`
- `docker compose exec -T db psql -U dispatchlite -d dispatchlite -c "\d jobs"`

Confirm:

- `users.role` supports `client`
- `jobs.current_status` supports `requested`
- `jobs.assigned_technician_id` is nullable
- `jobs.requested_by_user_id` exists

## 4) API auth checks

Valid token:

- `curl -s -H "Authorization: Bearer demo-client-1-token" http://localhost:3001/api/me`

Invalid token:

- `curl -i -s -H "Authorization: Bearer invalid-token" http://localhost:3001/api/me`

Expected:

- valid returns 200 + `ok:true`
- invalid returns 401 + `error.code=UNAUTHORIZED`

## 5) API role behavior checks

### 5.1 Client creates request

- `curl -s -X POST -H "Authorization: Bearer demo-client-1-token" -H "Content-Type: application/json" -d '{"title":"Smoke request","description":"Created by runbook","customerName":"Client One","customerPhone":"555-0199","address":"101 Demo Lane"}' http://localhost:3001/api/jobs/requests`

Expected:

- HTTP 201
- response contains `job.currentStatus = requested`
- response contains `job.assignedTechnicianId = null`

Capture returned `job.id` for next steps.

### 5.2 Non-client create should fail

- `curl -i -s -X POST -H "Authorization: Bearer demo-dispatcher-token" -H "Content-Type: application/json" -d '{"title":"Should fail","customerName":"x","address":"y"}' http://localhost:3001/api/jobs/requests`

Expected:

- HTTP 403
- `error.code=FORBIDDEN`

### 5.3 Dispatcher assigns requested job

- `curl -s -X PATCH -H "Authorization: Bearer demo-dispatcher-token" -H "Content-Type: application/json" -d '{"technicianId":"11111111-1111-1111-1111-111111111111"}' http://localhost:3001/api/jobs/<NEW_JOB_ID>/assign`

Expected:

- HTTP 200
- `job.currentStatus = scheduled`
- `job.assignedTechnicianId` is Ava technician UUID

### 5.4 Technician sees assigned job

- `curl -s -H "Authorization: Bearer demo-ava-token" http://localhost:3001/api/jobs`

Expected:

- returned `jobs[]` contains `<NEW_JOB_ID>`

### 5.5 Client sees own job details only

- `curl -s -H "Authorization: Bearer demo-client-1-token" http://localhost:3001/api/jobs/<NEW_JOB_ID>`

Expected:

- HTTP 200, includes `job` + `events`

Negative check:

- `curl -i -s -H "Authorization: Bearer demo-client-2-token" http://localhost:3001/api/jobs/<NEW_JOB_ID>`

Expected:

- HTTP 403

## 6) Dispatcher + technician mutation checks

Use an assigned job ID.

Dispatcher status update:

- `curl -s -X PATCH -H "Authorization: Bearer demo-dispatcher-token" -H "Content-Type: application/json" -d '{"newStatus":"on_my_way"}' http://localhost:3001/api/jobs/<JOB_ID>/status`

Technician note append:

- `curl -s -X POST -H "Authorization: Bearer demo-ava-token" -H "Content-Type: application/json" -d '{"note":"Smoke note from technician"}' http://localhost:3001/api/jobs/<JOB_ID>/notes`

Expected:

- both succeed for authorized role/assignment
- timeline contains `STATUS_CHANGED` and `NOTE_ADDED`

Client forbidden mutation:

- `curl -i -s -X PATCH -H "Authorization: Bearer demo-client-1-token" -H "Content-Type: application/json" -d '{"newStatus":"completed"}' http://localhost:3001/api/jobs/<JOB_ID>/status`

Expected:

- HTTP 403

## 7) UI checks

### Client view

- Open `http://localhost:5173/#client`
- Use `Demo Start` -> `Use Client 1 Token`
- Create request and verify it appears under `My Requests`

### Dispatcher view

- Open `http://localhost:5173/#dispatcher`
- Use `Demo Start` -> `Use Dispatcher Token`
- Filter by `requested`, assign a request

### Technician view

- Open `http://localhost:5173/#technician`
- Use `Demo Start` -> `Use Ava Tech Token`
- Verify assigned request appears and can be updated
