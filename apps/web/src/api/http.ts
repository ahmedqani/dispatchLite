import { getBearerToken } from "../auth/tokenStore";

export type JobStatus = "requested" | "scheduled" | "on_my_way" | "on_site" | "completed" | "cancelled";
export type JobEventType = "CREATED" | "STATUS_CHANGED" | "NOTE_ADDED";

export interface Job {
  id: string;
  title: string;
  description?: string | null;
  customerName: string;
  customerPhone?: string | null;
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

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: "dispatcher" | "technician" | "client";
  technicianId: string | null;
}

export interface Technician {
  id: string;
  name: string;
  trade: string;
  createdAt?: string;
}

export interface CreateJobRequestPayload {
  title: string;
  description?: string;
  appointmentStart?: string;
  appointmentEnd?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

interface ApiErrorPayload {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

const createHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getBearerToken()}`
});

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

export const fetchJobs = async (filters?: {
  status?: JobStatus;
  technicianId?: string;
}): Promise<Job[]> => {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.technicianId) {
    params.set("technicianId", filters.technicianId);
  }
  const query = params.toString();

  const response = await fetch(`${API_BASE_URL}/api/jobs${query ? `?${query}` : ""}`, {
    headers: createHeaders()
  });
  const payload = await handleResponse<{ ok: true; jobs: Job[] }>(response);
  return payload.jobs;
};

export const fetchJobDetail = async (jobId: string): Promise<{ job: Job; events: JobEvent[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
    headers: createHeaders()
  });
  const payload = await handleResponse<{ ok: true; job: Job; events: JobEvent[] }>(response);
  return { job: payload.job, events: payload.events };
};

export const updateJobStatus = async (jobId: string, newStatus: JobStatus): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: createHeaders(),
    body: JSON.stringify({ newStatus })
  });
  await handleResponse(response);
};

export const addJobNote = async (jobId: string, note: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/notes`, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify({ note })
  });
  await handleResponse(response);
};

export const createJobRequest = async (payload: CreateJobRequestPayload): Promise<{ job: Job; event: JobEvent }> => {
  const response = await fetch(`${API_BASE_URL}/api/client/jobs/requests`, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(payload)
  });
  return await handleResponse<{ ok: true; job: Job; event: JobEvent }>(response);
};

export const assignJob = async (jobId: string, technicianId: string): Promise<{ job: Job; event: JobEvent }> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/assign`, {
    method: "PATCH",
    headers: createHeaders(),
    body: JSON.stringify({ technicianId })
  });
  return await handleResponse<{ ok: true; job: Job; event: JobEvent }>(response);
};

export const fetchMe = async (): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    headers: createHeaders()
  });
  const payload = await handleResponse<{ ok: true; user: User }>(response);
  return payload.user;
};

export const fetchClientJobs = async (filters?: {
  status?: JobStatus;
}): Promise<Job[]> => {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/client/jobs${query ? `?${query}` : ""}`, {
    headers: createHeaders()
  });
  const payload = await handleResponse<{ ok: true; jobs: Job[] }>(response);
  return payload.jobs;
};

export const fetchClientJobDetail = async (jobId: string): Promise<{ job: Job; events: JobEvent[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/client/jobs/${jobId}`, {
    headers: createHeaders()
  });
  const payload = await handleResponse<{ ok: true; job: Job; events: JobEvent[] }>(response);
  return { job: payload.job, events: payload.events };
};

export const fetchTechnicians = async (): Promise<Technician[]> => {
  const response = await fetch(`${API_BASE_URL}/api/technicians`, {
    headers: createHeaders()
  });
  const payload = await handleResponse<{ ok: true; technicians: Technician[] }>(response);
  return payload.technicians;
};
