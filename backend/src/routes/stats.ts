import { Router } from "express";
import { getTargetStats } from "../lib/ssh.js";
import { logger } from "../lib/logger.js";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res) => {
  try {
    const stats = await getTargetStats();
    res.json(stats);
  } catch (err) {
    logger.error("Failed to fetch target stats", err);
    res.status(502).json({ error: "Failed to fetch stats from target server" });
  }
});
