import { Router } from "express";

import { VoiceoverRequestSchema } from "../schemas/requests";
import { generateVoiceover } from "../services/elevenlabs/ttsService";
import { asyncHandler } from "../utils/asyncHandler";

export const voiceoverRouter = Router();

voiceoverRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = VoiceoverRequestSchema.parse(req.body);
    const asset = await generateVoiceover(input);
    res.json({ asset });
  }),
);
