import { Router } from "express";
import { query } from "../../db/pool.js";

const techniciansRouter = Router();

interface TechnicianRow {
  id: string;
  name: string;
  trade: string;
  created_at: string;
}

techniciansRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query<TechnicianRow>(
      "SELECT id, name, trade, created_at FROM technicians ORDER BY created_at ASC"
    );
    res.json({ ok: true, technicians: result.rows });
  } catch (error) {
    next(error);
  }
});

export default techniciansRouter;
