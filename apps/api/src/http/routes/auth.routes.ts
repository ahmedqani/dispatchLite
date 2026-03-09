import { Router } from "express";

const authRouter = Router();

authRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "auth", ready: true });
});

export default authRouter;
