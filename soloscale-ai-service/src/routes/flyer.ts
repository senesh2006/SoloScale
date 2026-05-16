import { Router } from "express";

import { FlyerRequestSchema } from "../schemas/requests";
import { generateFlyer } from "../services/pixazo/imageService";
import { asyncHandler } from "../utils/asyncHandler";

export const flyerRouter = Router();

flyerRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = FlyerRequestSchema.parse(req.body);
    const asset = await generateFlyer(input);
    res.json({ asset });
  }),
);
