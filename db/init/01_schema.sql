-- db/init/01_schema.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trade text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('dispatcher', 'technician', 'client')),
  technician_id uuid NULL REFERENCES technicians(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_phone text NULL,
  default_service_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL
);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  customer_name text NOT NULL,
  customer_phone text NULL,
  address text NOT NULL,
  appointment_start timestamptz NOT NULL,
  appointment_end timestamptz NOT NULL,
  current_status text NOT NULL CHECK (current_status IN ('requested','scheduled','on_my_way','on_site','completed','cancelled')),
  assigned_technician_id uuid NULL REFERENCES technicians(id),
  requested_by_user_id uuid NULL REFERENCES users(id),
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('CREATED','STATUS_CHANGED','NOTE_ADDED')),
  old_status text NULL,
  new_status text NULL,
  note_text text NULL,
  actor_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX jobs_by_status ON jobs(current_status);
CREATE INDEX jobs_by_tech ON jobs(assigned_technician_id);
CREATE INDEX jobs_by_requested_status_created_at ON jobs(current_status, created_at DESC);
CREATE INDEX job_events_by_job_time ON job_events(job_id, created_at DESC);

COMMIT;
