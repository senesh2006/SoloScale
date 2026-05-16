import { Router } from "express";

import { StrategyRequestSchema } from "../schemas/requests";
import { generateStrategy } from "../services/gemini/strategyService";
import { asyncHandler } from "../utils/asyncHandler";

export const strategyRouter = Router();

strategyRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = StrategyRequestSchema.parse(req.body);
    const strategy = await generateStrategy(input);
    res.json({ strategy });
  }),
);
