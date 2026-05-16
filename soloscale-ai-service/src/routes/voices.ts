import { Router } from "express";

import { listVoiceNames } from "../services/elevenlabs/voicesService";
import { asyncHandler } from "../utils/asyncHandler";

export const voicesRouter = Router();

/** GET /api/voices — voice names for UI dropdowns (no IDs). */
voicesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const catalog = await listVoiceNames();
    res.json(catalog);
  }),
);
