import type { Job, JobEvent, UserRole } from "./domain.js";

export interface JobSubscriptionRequest {
  jobId: string;
}

export interface JobSubscriptionAck {
  ok: boolean;
  jobId: string;
  error?: "forbidden" | "not_found" | "invalid_request";
}

export interface ServerToClientEvents {
  "job:created": (payload: { job: Job }) => void;
  "job:updated": (payload: { job: Job }) => void;
  "job:event": (payload: { event: JobEvent }) => void;
}

export interface ClientToServerEvents {
  "job:subscribe": (
    payload: JobSubscriptionRequest,
    ack?: (response: JobSubscriptionAck) => void
  ) => void;
  "job:unsubscribe": (
    payload: JobSubscriptionRequest,
    ack?: (response: JobSubscriptionAck) => void
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId?: string;
  role?: UserRole;
  technicianId?: string | null;
}
