import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "@dispatchlite/shared/socket-events";
import { getBearerToken } from "../auth/tokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type DispatchSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type SocketConnectionStatus = "connected" | "disconnected";

let socketRef: DispatchSocket | null = null;

const getSocket = (): DispatchSocket => {
  if (socketRef) {
    return socketRef;
  }

  socketRef = io(API_BASE_URL, {
    transports: ["websocket"],
    auth: {
      token: getBearerToken()
    }
  });

  return socketRef;
};

export const subscribeToJobRoom = (
  jobId: string,
  handlers: {
    onJobUpdated: ServerToClientEvents["job:updated"];
    onJobEvent: ServerToClientEvents["job:event"];
    onDenied?: (error: string) => void;
  }
): (() => void) => {
  const socket = getSocket();
  let isActive = true;
  const updatedHandler: ServerToClientEvents["job:updated"] = (payload) => {
    if (payload.job.id === jobId) {
      handlers.onJobUpdated(payload);
    }
  };
  const eventHandler: ServerToClientEvents["job:event"] = (payload) => {
    if (payload.event.jobId === jobId) {
      handlers.onJobEvent(payload);
    }
  };

  socket.on("job:updated", updatedHandler);
  socket.on("job:event", eventHandler);

  const subscribe = () => {
    if (!isActive) {
      return;
    }
    socket.emit("job:subscribe", { jobId }, (ack) => {
      if (!ack.ok) {
        handlers.onDenied?.(ack.error ?? "unknown");
      }
    });
  };

  const reconnectHandler = () => {
    subscribe();
  };

  socket.on("connect", reconnectHandler);
  subscribe();

  return () => {
    isActive = false;
    socket.emit("job:unsubscribe", { jobId });
    socket.off("job:updated", updatedHandler);
    socket.off("job:event", eventHandler);
    socket.off("connect", reconnectHandler);
  };
};

export const subscribeToSocketStatus = (
  onStatusChange: (status: SocketConnectionStatus) => void
): (() => void) => {
  const socket = getSocket();

  const notifyConnected = () => onStatusChange("connected");
  const notifyDisconnected = () => onStatusChange("disconnected");

  // Emit initial state immediately on subscribe.
  onStatusChange(socket.connected ? "connected" : "disconnected");

  socket.on("connect", notifyConnected);
  socket.on("disconnect", notifyDisconnected);

  return () => {
    socket.off("connect", notifyConnected);
    socket.off("disconnect", notifyDisconnected);
  };
};

export const subscribeToDispatcherFeed = (
  handlers: {
    onJobCreated: ServerToClientEvents["job:created"];
  }
): (() => void) => {
  const socket = getSocket();
  const createdHandler: ServerToClientEvents["job:created"] = (payload) => {
    handlers.onJobCreated(payload);
  };
  socket.on("job:created", createdHandler);
  return () => {
    socket.off("job:created", createdHandler);
  };
};
