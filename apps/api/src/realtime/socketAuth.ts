import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from "@dispatchlite/shared/socket-events";
import { findUserByToken } from "../db/queries/auth.js";

export const attachSocketAuth = (
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token === "string" && token.trim().length > 0) {
      const user = await findUserByToken(token);
      if (user) {
        socket.data.userId = user.id;
        socket.data.role = user.role;
        socket.data.technicianId = user.technicianId;
      }
    }
    next();
  });
};
