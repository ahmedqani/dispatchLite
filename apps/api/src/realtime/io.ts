import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import type {
  ClientToServerEvents,
  JobSubscriptionAck,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from "@dispatchlite/shared/socket-events";
import { getJobById } from "../db/queries/jobs.js";
import { attachSocketAuth } from "./socketAuth.js";

type DispatchIo = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let ioInstance: DispatchIo | null = null;
const getJobRoom = (jobId: string): string => `job:${jobId}`;
const getRoleRoom = (role: string): string => `role:${role}`;

const ensureSubscriptionPermission = async (
  socketData: SocketData,
  jobId: string
): Promise<JobSubscriptionAck> => {
  if (!jobId || typeof jobId !== "string") {
    return { ok: false, jobId, error: "invalid_request" };
  }

  const job = await getJobById(jobId);
  if (!job) {
    return { ok: false, jobId, error: "not_found" };
  }

  if (socketData.role === "dispatcher") {
    return { ok: true, jobId };
  }

  if (socketData.role === "technician" && socketData.technicianId === job.assignedTechnicianId) {
    return { ok: true, jobId };
  }

  if (socketData.role === "client" && socketData.userId && socketData.userId === job.requestedByUserId) {
    return { ok: true, jobId };
  }

  return { ok: false, jobId, error: "forbidden" };
};

export const attachIo = (httpServer: HttpServer): DispatchIo => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: "*"
      }
    }
  );

  attachSocketAuth(io);

  io.on("connection", (socket) => {
    console.log(`[io] client connected: ${socket.id}`);
    if (socket.data.role) {
      void socket.join(getRoleRoom(socket.data.role));
    }

    socket.on("job:subscribe", async (payload, ack) => {
      const check = await ensureSubscriptionPermission(socket.data, payload?.jobId);
      if (!check.ok) {
        ack?.(check);
        return;
      }
      const room = getJobRoom(payload.jobId);
      await socket.join(room);
      ack?.({ ok: true, jobId: payload.jobId });
      console.log(`[io] ${socket.id} subscribed ${room}`);
    });

    socket.on("job:unsubscribe", async (payload, ack) => {
      const check = await ensureSubscriptionPermission(socket.data, payload?.jobId);
      if (!check.ok) {
        ack?.(check);
        return;
      }
      const room = getJobRoom(payload.jobId);
      await socket.leave(room);
      ack?.({ ok: true, jobId: payload.jobId });
      console.log(`[io] ${socket.id} unsubscribed ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[io] client disconnected: ${socket.id} (${reason})`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIo = (): DispatchIo => {
  if (!ioInstance) {
    throw new Error("Socket.IO server not initialized.");
  }
  return ioInstance;
};
