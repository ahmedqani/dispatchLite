export const JOB_STATUSES = [
  "requested",
  "scheduled",
  "on_my_way",
  "on_site",
  "completed",
  "cancelled"
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const USER_ROLES = ["dispatcher", "technician", "client"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const JOB_EVENT_TYPES = ["CREATED", "STATUS_CHANGED", "NOTE_ADDED"] as const;
export type JobEventType = (typeof JOB_EVENT_TYPES)[number];

export interface Technician {
  id: string;
  name: string;
  trade: string;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  technicianId: string | null;
  createdAt?: string;
}

export interface JobSummary {
  id: string;
  title: string;
  customerName: string;
  address: string;
  appointmentStart: string;
  appointmentEnd: string;
  currentStatus: JobStatus;
  assignedTechnicianId: string | null;
  requestedByUserId?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job extends JobSummary {}

export interface JobEvent {
  id: string;
  jobId: string;
  eventType: JobEventType;
  oldStatus: JobStatus | null;
  newStatus: JobStatus | null;
  noteText: string | null;
  actorUserId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface JobsListResponse {
  jobs: JobSummary[];
}

export interface JobDetailResponse {
  job: Job;
  events: JobEvent[];
}

export interface TechniciansResponse {
  technicians: Technician[];
}
