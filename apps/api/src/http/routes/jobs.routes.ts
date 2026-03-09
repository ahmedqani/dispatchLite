import { Router } from "express";
import { getJobById, listJobEvents, listJobs } from "../../db/queries/jobs.js";
import { withTransaction } from "../../db/tx.js";
import { getIo } from "../../realtime/io.js";
import { ApiError } from "../middleware/error.js";
import { z } from "zod";

const jobsRouter = Router();
type JobStatus = "requested" | "scheduled" | "on_my_way" | "on_site" | "completed" | "cancelled";
const patchStatusBodySchema = z.object({
  newStatus: z.enum(["requested", "scheduled", "on_my_way", "on_site", "completed", "cancelled"])
});
const addNoteBodySchema = z.object({
  note: z.string().trim().min(1)
});
const assignJobBodySchema = z.object({
  technicianId: z.string().trim().min(1)
});
const toJobRoom = (jobId: string): string => `job:${jobId}`;

const assertMutationAccess = (
  user:
    | {
        role: "dispatcher" | "technician" | "client";
        technicianId: string | null;
      }
    | undefined,
  assignedTechnicianId: string | null
): void => {
  if (!user) {
    throw new ApiError({
      code: "UNAUTHORIZED",
      message: "Missing authenticated user context.",
      statusCode: 401
    });
  }

  if (user.role === "dispatcher") {
    return;
  }

  if (user.role === "client") {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Clients are not allowed to mutate jobs.",
      statusCode: 403
    });
  }

  if (!user.technicianId || user.technicianId !== assignedTechnicianId) {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Technician is not allowed to mutate this job.",
      statusCode: 403
    });
  }
};

const assertDispatcher = (
  user:
    | {
        role: "dispatcher" | "technician" | "client";
      }
    | undefined
): void => {
  if (!user || user.role !== "dispatcher") {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Only dispatchers can perform this action.",
      statusCode: 403
    });
  }
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

jobsRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const queryTechnicianId = typeof req.query.technicianId === "string" ? req.query.technicianId : undefined;

    if (!req.user) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "Missing authenticated user context.",
        statusCode: 401
      });
    }

    const filters: { status?: string; technicianId?: string; requestedByUserId?: string } = { status };
    if (req.user.role === "dispatcher") {
      filters.technicianId = queryTechnicianId;
    } else if (req.user.role === "technician") {
      if (!req.user.technicianId) {
        res.json({ ok: true, jobs: [] });
        return;
      }
      filters.technicianId = req.user.technicianId;
    } else if (req.user.role === "client") {
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Clients should use /api/client/jobs.",
        statusCode: 403
      });
    }

    const jobs = await listJobs(filters);
    res.json({ ok: true, jobs });
  } catch (error) {
    next(error);
  }
});

jobsRouter.get("/:jobId", async (req, res, next) => {
  try {
    const job = await getJobById(req.params.jobId);
    if (!job) {
      throw new ApiError({
        code: "JOB_NOT_FOUND",
        message: "Job not found.",
        statusCode: 404
      });
    }

    if (!req.user) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "Missing authenticated user context.",
        statusCode: 401
      });
    }

    if (req.user.role === "technician" && (!req.user.technicianId || req.user.technicianId !== job.assignedTechnicianId)) {
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Technician is not allowed to view this job.",
        statusCode: 403
      });
    }
    if (req.user.role === "client") {
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Clients should use /api/client/jobs/:jobId.",
        statusCode: 403
      });
    }

    const events = await listJobEvents(job.id);
    res.json({ ok: true, job, events });
  } catch (error) {
    next(error);
  }
});

jobsRouter.patch("/:jobId/assign", async (req, res, next) => {
  try {
    assertDispatcher(req.user);
    const parsed = assignJobBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Invalid request body for assignment.",
        statusCode: 400
      });
    }

    const actorUserId = req.user?.id ?? null;
    const { job, event } = await withTransaction(async (db) => {
      const currentJobResult = await db.query<{
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
        `SELECT id, title, description, customer_name, customer_phone, address,
                appointment_start, appointment_end, current_status, assigned_technician_id,
                requested_by_user_id, created_by_user_id, created_at, updated_at
         FROM jobs
         WHERE id = $1
         FOR UPDATE`,
        [req.params.jobId]
      );

      const currentJob = currentJobResult.rows[0];
      if (!currentJob) {
        throw new ApiError({
          code: "JOB_NOT_FOUND",
          message: "Job not found.",
          statusCode: 404
        });
      }
      if (currentJob.current_status !== "requested") {
        throw new ApiError({
          code: "BAD_REQUEST",
          message: "Only requested jobs can be assigned.",
          statusCode: 400
        });
      }

      const technicianResult = await db.query<{ id: string }>(
        `SELECT id FROM technicians WHERE id = $1 LIMIT 1`,
        [parsed.data.technicianId]
      );
      if (!technicianResult.rows[0]) {
        throw new ApiError({
          code: "TECHNICIAN_NOT_FOUND",
          message: "Technician not found.",
          statusCode: 404
        });
      }

      const updatedJobResult = await db.query<{
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
        `UPDATE jobs
         SET assigned_technician_id = $2, current_status = 'scheduled', updated_at = now()
         WHERE id = $1
         RETURNING id, title, description, customer_name, customer_phone, address,
                   appointment_start, appointment_end, current_status, assigned_technician_id,
                   requested_by_user_id, created_by_user_id, created_at, updated_at`,
        [req.params.jobId, parsed.data.technicianId]
      );

      const insertedEventResult = await db.query<{
        id: string;
        job_id: string;
        event_type: "STATUS_CHANGED";
        old_status: string | null;
        new_status: string | null;
        note_text: string | null;
        actor_user_id: string | null;
        created_at: string;
        metadata: Record<string, unknown>;
      }>(
        `INSERT INTO job_events (job_id, event_type, old_status, new_status, actor_user_id, metadata)
         VALUES ($1, 'STATUS_CHANGED', $2, 'scheduled', $3, $4::jsonb)
         RETURNING id, job_id, event_type, old_status, new_status, note_text, actor_user_id, created_at, metadata`,
        [
          req.params.jobId,
          currentJob.current_status,
          actorUserId,
          JSON.stringify({ assignedTechnicianId: parsed.data.technicianId, source: "dispatcher_assign" })
        ]
      );

      return {
        job: updatedJobResult.rows[0],
        event: insertedEventResult.rows[0]
      };
    });

    const io = getIo();
    const room = toJobRoom(job.id);
    io.to(room).emit("job:updated", { job: mapJob(job) });
    io.to(room).emit("job:event", { event: mapEvent(event) });
    res.json({ ok: true, job: mapJob(job), event: mapEvent(event) });
  } catch (error) {
    next(error);
  }
});

jobsRouter.patch("/:jobId/status", async (req, res, next) => {
  try {
    const parsed = patchStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Invalid request body for status update.",
        statusCode: 400
      });
    }

    const actorUserId = req.user?.id ?? null;
    const { job, event } = await withTransaction(async (db) => {
      const currentJobResult = await db.query<{
        id: string;
        current_status: JobStatus;
        assigned_technician_id: string | null;
      }>(
        `SELECT id, current_status, assigned_technician_id
         FROM jobs
         WHERE id = $1
         FOR UPDATE`,
        [req.params.jobId]
      );

      const currentJob = currentJobResult.rows[0];
      if (!currentJob) {
        throw new ApiError({
          code: "JOB_NOT_FOUND",
          message: "Job not found.",
          statusCode: 404
        });
      }
      assertMutationAccess(req.user, currentJob.assigned_technician_id);

      const updatedJobResult = await db.query<{
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
        `UPDATE jobs
         SET current_status = $2, updated_at = now()
         WHERE id = $1
         RETURNING id, title, description, customer_name, customer_phone, address,
                   appointment_start, appointment_end, current_status, assigned_technician_id, requested_by_user_id,
                   created_by_user_id, created_at, updated_at`,
        [req.params.jobId, parsed.data.newStatus]
      );

      const insertedEventResult = await db.query<{
        id: string;
        job_id: string;
        event_type: "STATUS_CHANGED";
        old_status: string | null;
        new_status: string | null;
        note_text: string | null;
        actor_user_id: string | null;
        created_at: string;
        metadata: Record<string, unknown>;
      }>(
        `INSERT INTO job_events (job_id, event_type, old_status, new_status, actor_user_id)
         VALUES ($1, 'STATUS_CHANGED', $2, $3, $4)
         RETURNING id, job_id, event_type, old_status, new_status, note_text, actor_user_id, created_at, metadata`,
        [req.params.jobId, currentJob.current_status, parsed.data.newStatus, actorUserId]
      );

      return {
        job: updatedJobResult.rows[0],
        event: insertedEventResult.rows[0]
      };
    });

    const responseJob = mapJob(job);
    const responseEvent = mapEvent(event);

    const io = getIo();
    const room = toJobRoom(job.id);
    io.to(room).emit("job:updated", { job: responseJob });
    io.to(room).emit("job:event", { event: responseEvent });

    res.json({ ok: true, job: responseJob, event: responseEvent });
  } catch (error) {
    next(error);
  }
});

jobsRouter.post("/:jobId/notes", async (req, res, next) => {
  try {
    const parsed = addNoteBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Invalid request body for note append.",
        statusCode: 400
      });
    }

    const actorUserId = req.user?.id ?? null;
    const actorMetadata = {
      actorRole: req.user?.role ?? null,
      actorEmail: req.user?.email ?? null
    };

    const event = await withTransaction(async (db) => {
      const currentJobResult = await db.query<{ id: string; assigned_technician_id: string | null }>(
        `SELECT id, assigned_technician_id
         FROM jobs
         WHERE id = $1
         FOR UPDATE`,
        [req.params.jobId]
      );

      const currentJob = currentJobResult.rows[0];
      if (!currentJob) {
        throw new ApiError({
          code: "JOB_NOT_FOUND",
          message: "Job not found.",
          statusCode: 404
        });
      }
      assertMutationAccess(req.user, currentJob.assigned_technician_id);

      const insertedEventResult = await db.query<{
        id: string;
        job_id: string;
        event_type: "NOTE_ADDED";
        old_status: string | null;
        new_status: string | null;
        note_text: string | null;
        actor_user_id: string | null;
        created_at: string;
        metadata: Record<string, unknown>;
      }>(
        `INSERT INTO job_events (job_id, event_type, note_text, actor_user_id, metadata)
         VALUES ($1, 'NOTE_ADDED', $2, $3, $4::jsonb)
         RETURNING id, job_id, event_type, old_status, new_status, note_text, actor_user_id, created_at, metadata`,
        [req.params.jobId, parsed.data.note, actorUserId, JSON.stringify(actorMetadata)]
      );

      return insertedEventResult.rows[0];
    });

    const responseEvent = mapEvent(event);

    const currentJob = await getJobById(req.params.jobId);
    if (currentJob) {
      const io = getIo();
      const room = toJobRoom(req.params.jobId);
      io.to(room).emit("job:updated", { job: currentJob });
      io.to(room).emit("job:event", { event: responseEvent });
    }

    res.json({ ok: true, event: responseEvent });
  } catch (error) {
    next(error);
  }
});

export default jobsRouter;
