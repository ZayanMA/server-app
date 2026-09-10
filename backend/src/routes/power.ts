import { Router } from "express";
import { config } from "../config.js";
import { getPowerPhase, shutdownTarget } from "../lib/ssh.js";
import { sendMagicPacket } from "../lib/wol.js";
import { logger } from "../lib/logger.js";

export const powerRouter = Router();

powerRouter.get("/status", async (_req, res) => {
  const phase = await getPowerPhase();
  res.json({ phase });
});

powerRouter.post("/wake", async (_req, res) => {
  try {
    await sendMagicPacket(
      config.target.macAddress,
      config.target.broadcastAddress,
      config.target.wolPort,
    );
    logger.info("Sent Wake-on-LAN packet to target server");
    res.json({ ok: true });
  } catch (err) {
    logger.error("Failed to send WoL packet", err);
    res.status(500).json({ error: "Failed to send Wake-on-LAN packet" });
  }
});

powerRouter.post("/shutdown", async (_req, res) => {
  try {
    await shutdownTarget();
    logger.info("Sent shutdown command to target server");
    res.json({ ok: true });
  } catch (err) {
    logger.error("Failed to shut down target server", err);
    res.status(500).json({ error: "Failed to shut down target server" });
  }
});
