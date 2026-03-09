import { query } from "../pool.js";

export interface JobRecord {
  id: string;
  title: string;
  description: string | null;
  customerName: string;
  customerPhone: string | null;
  address: string;
  appointmentStart: string;
  appointmentEnd: string;
  currentStatus: "requested" | "scheduled" | "on_my_way" | "on_site" | "completed" | "cancelled";
  assignedTechnicianId: string | null;
  requestedByUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobEventRecord {
  id: string;
  jobId: string;
  eventType: "CREATED" | "STATUS_CHANGED" | "NOTE_ADDED";
  oldStatus: string | null;
  newStatus: string | null;
  noteText: string | null;
  actorUserId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  customer_name: string;
  customer_phone: string | null;
  address: string;
  appointment_start: string;
  appointment_end: string;
  current_status: JobRecord["currentStatus"];
  assigned_technician_id: string | null;
  requested_by_user_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface JobEventRow {
  id: string;
  job_id: string;
  event_type: JobEventRecord["eventType"];
  old_status: string | null;
  new_status: string | null;
  note_text: string | null;
  actor_user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface ListJobsFilters {
  status?: string;
  technicianId?: string;
  requestedByUserId?: string;
}

const mapJob = (row: JobRow): JobRecord => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    appointmentStart: row.appointment_start,
    appointmentEnd: row.appointment_end,
    currentStatus: row.current_status,
    assignedTechnicianId: row.assigned_technician_id,
    requestedByUserId: row.requested_by_user_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const mapJobEvent = (row: JobEventRow): JobEventRecord => {
  return {
    id: row.id,
    jobId: row.job_id,
    eventType: row.event_type,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    noteText: row.note_text,
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    metadata: row.metadata
  };
};

export const listJobs = async (filters: ListJobsFilters): Promise<JobRecord[]> => {
  const params: unknown[] = [];
  const whereParts: string[] = [];

  if (filters.status) {
    params.push(filters.status);
    whereParts.push(`current_status = $${params.length}`);
  }

  if (filters.technicianId) {
    params.push(filters.technicianId);
    whereParts.push(`assigned_technician_id = $${params.length}`);
  }

  if (filters.requestedByUserId) {
    params.push(filters.requestedByUserId);
    whereParts.push(`requested_by_user_id = $${params.length}`);
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const result = await query<JobRow>(
    `SELECT id, title, description, customer_name, customer_phone, address,
            appointment_start, appointment_end, current_status, assigned_technician_id, requested_by_user_id,
            created_by_user_id, created_at, updated_at
     FROM jobs
     ${whereClause}
     ORDER BY appointment_start ASC`,
    params
  );

  return result.rows.map(mapJob);
};

export const getJobById = async (jobId: string): Promise<JobRecord | null> => {
  const result = await query<JobRow>(
    `SELECT id, title, description, customer_name, customer_phone, address,
            appointment_start, appointment_end, current_status, assigned_technician_id, requested_by_user_id,
            created_by_user_id, created_at, updated_at
     FROM jobs
     WHERE id = $1
     LIMIT 1`,
    [jobId]
  );

  const row = result.rows[0];
  return row ? mapJob(row) : null;
};

export const listJobEvents = async (jobId: string): Promise<JobEventRecord[]> => {
  const result = await query<JobEventRow>(
    `SELECT id, job_id, event_type, old_status, new_status, note_text, actor_user_id, created_at, metadata
     FROM job_events
     WHERE job_id = $1
     ORDER BY created_at ASC`,
    [jobId]
  );

  return result.rows.map(mapJobEvent);
};
