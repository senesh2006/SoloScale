// Side-effect import: must come BEFORE anything that issues an HTTP request.
// Installs a Windows-friendly undici dispatcher (IPv4-only, no keep-alive)
// to work around ECONNRESET against googleapis.com on Defender/middlebox setups.
import "./httpAgent";

import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";

import { config } from "./config";
import { strategyRouter } from "./routes/strategy";
import { flyerRouter } from "./routes/flyer";
import { voiceoverRouter } from "./routes/voiceover";
import { voicesRouter } from "./routes/voices";
import { campaignRouter } from "./routes/campaign";
import { errorHandler } from "./middleware/errorHandler";
import { STRATEGY_KEY_POOL } from "./services/gemini/strategyService";
import {
  PIXAZO_FLYER_MODEL,
  PIXAZO_FLYER_HEIGHT,
  PIXAZO_FLYER_WIDTH,
} from "./services/pixazo/models";
import { logger, nextReqId, runInRequest } from "./utils/logger";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const projectRoot = path.resolve(__dirname, "..");
const uploadsDir = path.join(projectRoot, "uploads");
const publicDir = path.join(projectRoot, "public");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));
app.use("/", express.static(publicDir));

// Per-request context + structured access log for API calls (skip /uploads
// to avoid spamming the terminal whenever the browser plays a generated MP3).
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const id = nextReqId();
  runInRequest(id, () => {
    const log = logger("http");
    log.start(`${req.method} ${req.path}`);
    res.on("finish", () => {
      const sym = res.statusCode >= 400 ? "fail" : "ok";
      if (sym === "ok") log.ok(`HTTP ${res.statusCode}`);
      else log.fail(`HTTP ${res.statusCode}`);
    });
    next();
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "soloscale-ai-service",
    storage: config.storageDriver,
    models: {
      text: config.gemini.textModel,
      image: `pixazo:${PIXAZO_FLYER_MODEL}`,
      tts: `elevenlabs:${config.elevenlabs.modelId}`,
    },
    keyPools: {
      strategy: { size: STRATEGY_KEY_POOL.keys.length },
    },
    pixazo: {
      model: PIXAZO_FLYER_MODEL,
      freeTier: true,
      flyerSize: `${config.pixazo.width}x${config.pixazo.height}`,
    },
    elevenlabs: {
      voiceId: config.elevenlabs.voiceId,
      outputFormat: config.elevenlabs.outputFormat,
    },
  });
});

app.use("/api/strategy", strategyRouter);
app.use("/api/flyer", flyerRouter);
app.use("/api/voiceover", voiceoverRouter);
app.use("/api/voices", voicesRouter);
app.use("/api/campaign", campaignRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  const log = logger("startup");
  log.info(`listening on ${config.publicBaseUrl} (port ${config.port})`);
  log.info(`test UI: ${config.publicBaseUrl}/`);
  log.info(
    `models: text=${config.gemini.textModel} image=pixazo:${PIXAZO_FLYER_MODEL} (free, ${config.pixazo.width}x${config.pixazo.height}) tts=elevenlabs:${config.elevenlabs.modelId}`,
  );
  if (
    config.pixazo.width !== PIXAZO_FLYER_WIDTH ||
    config.pixazo.height !== PIXAZO_FLYER_HEIGHT
  ) {
    log.info(
      `pixazo flyer size ${config.pixazo.width}x${config.pixazo.height} (default ${PIXAZO_FLYER_WIDTH}x${PIXAZO_FLYER_HEIGHT}, max edge 1024px)`,
    );
  }
  const strategySize = STRATEGY_KEY_POOL.keys.length;
  log.info(
    `strategy key pool: ${strategySize} key${strategySize === 1 ? "" : "s"} (main + image pool, auto-rotate on HTTP 429)`,
  );
});
