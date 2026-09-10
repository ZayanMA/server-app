import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { powerRouter } from "./routes/power.js";
import { statsRouter } from "./routes/stats.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/power", requireAuth, powerRouter);
app.use("/api/stats", requireAuth, statsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

if (config.staticDir) {
  const staticDir = path.resolve(config.staticDir);
  app.use(express.static(staticDir));
  // SPA fallback: anything that isn't an API route serves index.html.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.listen(config.port, () => {
  logger.info(`server-app backend listening on port ${config.port}`);
});
