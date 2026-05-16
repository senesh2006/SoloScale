import { NextFunction, Request, Response } from "express";
import { ApiError } from "@google/genai";
import { ZodError } from "zod";

import { logger } from "../utils/logger";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "ValidationError",
      message: "Request body failed validation.",
      issues: err.issues,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof ApiError) {
    const status = err.status ?? 502;
    const message =
      status === 429
        ? "Gemini quota exceeded (HTTP 429). Free-tier image/TTS models have low per-minute and per-day limits. Wait ~60s and retry, or use a paid key."
        : err.message;
    res.status(status).json({
      error: "GeminiApiError",
      message,
    });
    return;
  }

  // Node 22 wraps low-level failures as "fetch failed" with the real cause on .cause.
  let message =
    err instanceof Error ? err.message : "Unknown server error";
  if (
    err instanceof Error &&
    message === "fetch failed" &&
    (err as { cause?: unknown }).cause instanceof Error
  ) {
    message = `fetch failed: ${((err as { cause: Error }).cause).message}`;
  }

  logger("error").info(`unhandled: ${message}`);
  // Still print the full stack to stderr for debugging - the structured log
  // line above gives you the one-liner, this gives you the trace.
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: "InternalServerError",
    message,
  });
}
