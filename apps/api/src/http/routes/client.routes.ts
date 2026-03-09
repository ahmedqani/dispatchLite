import { Router } from "express";
import { getJobById, listJobEvents, listJobs } from "../../db/queries/jobs.js";
import { withTransaction } from "../../db/tx.js";
import { getIo } from "../../realtime/io.js";
import { ApiError } from "../middleware/error.js";
import { z } from "zod";

const clientRouter = Router();
type JobStatus = "requested" | "scheduled" | "on_my_way" | "on_site" | "completed" | "cancelled";

const createRequestBodySchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  appointmentStart: z.string().trim().optional(),
  appointmentEnd: z.string().trim().optional()
});

const assertClient = (
  user:
    | {
        id: string;
        role: "dispatcher" | "technician" | "client";
      }
    | undefined
): { id: string } => {
  if (!user || user.role !== "client") {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Only clients can perform this action.",
      statusCode: 403
    });
  }
  return { id: user.id };
};

const mapJob = (job: {
  id: string;
  title: string;
  description: string | null;
  customer_name: string;
  customer_phone: string | null;
  address: string;
  appointment_start: string;
  appointment_end: string;
  current_status: JobStatus;
  assigned_technician_id: string | null;
  requested_by_user_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}) => ({
  id: job.id,
  title: job.title,
  description: job.description,
  customerName: job.customer_name,
  customerPhone: job.customer_phone,
  address: job.address,
  appointmentStart: job.appointment_start,
  appointmentEnd: job.appointment_end,
  currentStatus: job.current_status,
  assignedTechnicianId: job.assigned_technician_id,
  requestedByUserId: job.requested_by_user_id,
  createdByUserId: job.created_by_user_id,
  createdAt: job.created_at,
  updatedAt: job.updated_at
});

const mapEvent = (event: {
  id: string;
  job_id: string;
  event_type: "CREATED" | "STATUS_CHANGED" | "NOTE_ADDED";
  old_status: string | null;
  new_status: string | null;
  note_text: string | null;
  actor_user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}) => ({
  id: event.id,
  jobId: event.job_id,
  eventType: event.event_type,
  oldStatus: event.old_status as JobStatus | null,
  newStatus: event.new_status as JobStatus | null,
  noteText: event.note_text,
  actorUserId: event.actor_user_id,
  createdAt: event.created_at,
  metadata: event.metadata
});

clientRouter.get("/jobs", async (req, res, next) => {
  try {
    const client = assertClient(req.user);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const jobs = await listJobs({ status, requestedByUserId: client.id });
    res.json({ ok: true, jobs });
  } catch (error) {
    next(error);
  }
});

clientRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    const client = assertClient(req.user);
    const job = await getJobById(req.params.jobId);
    if (!job) {
      throw new ApiError({
        code: "JOB_NOT_FOUND",
        message: "Job not found.",
        statusCode: 404
      });
    }
    if (job.requestedByUserId !== client.id) {
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Client is not allowed to view this job.",
        statusCode: 403
      });
    }
    const events = await listJobEvents(job.id);
    res.json({ ok: true, job, events });
  } catch (error) {
    next(error);
  }
});

clientRouter.post("/jobs/requests", async (req, res, next) => {
  try {
    const client = assertClient(req.user);
    const parsed = createRequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Invalid request body for job request creation.",
        statusCode: 400
      });
    }

    const now = Date.now();
    const appointmentStart = parsed.data.appointmentStart ? new Date(parsed.data.appointmentStart) : new Date(now + 24 * 60 * 60 * 1000);
    let appointmentEnd = parsed.data.appointmentEnd ? new Date(parsed.data.appointmentEnd) : new Date(appointmentStart.getTime() + 60 * 60 * 1000);
    if (Number.isNaN(appointmentStart.getTime()) || Number.isNaN(appointmentEnd.getTime())) {
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Invalid appointment window.",
        statusCode: 400
      });
    }
    if (appointmentEnd <= appointmentStart) {
      appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000);
    }

    const { job, event } = await withTransaction(async (db) => {
      const clientProfileResult = await db.query<{
        display_name: string;
        default_phone: string | null;
        default_service_address: string;
      }>(
        `SELECT u.display_name, c.default_phone, c.default_service_address
         FROM clients c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.user_id = $1
         LIMIT 1`,
        [client.id]
      );
      const clientProfile = clientProfileResult.rows[0];
      if (!clientProfile) {
        throw new ApiError({
          code: "CLIENT_PROFILE_NOT_FOUND",
          message: "Client profile not found.",
          statusCode: 404
        });
      }

      const createdJobResult = await db.query<{
        id: string;
        title: string;
        description: string | null;
        customer_name: string;
        customer_phone: string | null;
        address: string;
        appointment_start: string;
        appointment_end: string;
        current_status: JobStatus;
        assigned_technician_id: string | null;
        requested_by_user_id: string | null;
        created_by_user_id: string;
        created_at: string;
        updated_at: string;
      }>(
        `INSERT INTO jobs (
          title, description, customer_name, customer_phone, address,
          appointment_start, appointment_end, current_status, assigned_technician_id,
          requested_by_user_id, created_by_user_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'requested', NULL,
          $8, $9
        )
        RETURNING id, title, description, customer_name, customer_phone, address,
                  appointment_start, appointment_end, current_status, assigned_technician_id,
                  requested_by_user_id, created_by_user_id, created_at, updated_at`,
        [
          parsed.data.title,
          parsed.data.description ?? null,
          clientProfile.display_name,
          clientProfile.default_phone,
          clientProfile.default_service_address,
          appointmentStart.toISOString(),
          appointmentEnd.toISOString(),
          client.id,
          client.id
        ]
      );

      const insertedEventResult = await db.query<{
        id: string;
        job_id: string;
        event_type: "CREATED";
        old_status: string | null;
        new_status: string | null;
        note_text: string | null;
        actor_user_id: string | null;
        created_at: string;
        metadata: Record<string, unknown>;
      }>(
        `INSERT INTO job_events (job_id, event_type, actor_user_id, metadata)
         VALUES ($1, 'CREATED', $2, $3::jsonb)
         RETURNING id, job_id, event_type, old_status, new_status, note_text, actor_user_id, created_at, metadata`,
        [createdJobResult.rows[0].id, client.id, JSON.stringify({ source: "client_request" })]
      );

      return {
        job: createdJobResult.rows[0],
        event: insertedEventResult.rows[0]
      };
    });

    const responseJob = mapJob(job);
    const responseEvent = mapEvent(event);
    const io = getIo();
    io.to("role:dispatcher").emit("job:created", { job: responseJob });
    io.to(`job:${responseJob.id}`).emit("job:event", { event: responseEvent });

    res.status(201).json({ ok: true, job: responseJob, event: responseEvent });
  } catch (error) {
    next(error);
  }
});

export default clientRouter;

