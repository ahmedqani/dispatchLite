import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import authRouter from "./http/routes/auth.routes.js";
import clientRouter from "./http/routes/client.routes.js";
import jobsRouter from "./http/routes/jobs.routes.js";
import techniciansRouter from "./http/routes/technicians.routes.js";
import { requireAuth } from "./http/middleware/auth.js";
import { errorHandler, notFoundHandler } from "./http/middleware/error.js";
import { attachIo } from "./realtime/io.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dispatchlite-api" });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.use("/api/auth", authRouter);
app.use("/api/jobs", requireAuth, jobsRouter);
app.use("/api/client", requireAuth, clientRouter);
app.use("/api/technicians", requireAuth, techniciansRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3001);
const httpServer = createServer(app);

attachIo(httpServer);

httpServer.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
