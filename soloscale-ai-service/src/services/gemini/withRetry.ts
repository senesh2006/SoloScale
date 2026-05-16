import { ApiError } from "@google/genai";

import { logger } from "../../utils/logger";

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  label?: string;
}

const TRANSIENT_NET_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

function getCauseCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return String((cause as { code: unknown }).code);
  }
  return undefined;
}

/**
 * Returns true for errors worth retrying:
 *  - Node 22 `TypeError: fetch failed` wrapping a transient network code
 *  - Gemini ApiError with HTTP 5xx (server errors)
 *  - Curl-shim errors tagged with `transient: true` (network/TLS exit codes)
 * Returns false for 4xx (including 429) so we fail fast on quota / bad input.
 */
export function isTransient(err: unknown): boolean {
  if (err instanceof ApiError) {
    return typeof err.status === "number" && err.status >= 500 && err.status <= 599;
  }
  // Curl shim tags transient network failures (exit codes 6/7/28/35/52/55/56/92).
  if (
    err instanceof Error &&
    (err as { transient?: boolean }).transient === true
  ) {
    return true;
  }
  const code = getCauseCode(err);
  if (code && TRANSIENT_NET_CODES.has(code)) return true;
  // Node's wrapper TypeError sometimes just says "fetch failed" with no
  // identifiable code on the cause. Treat it as transient too - one retry is cheap.
  if (err instanceof Error && err.message === "fetch failed") return true;
  return false;
}

/**
 * Retry a Gemini call with exponential backoff + jitter.
 * Defaults: 2 retries (3 attempts total), 800ms base delay.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelay = opts.baseDelayMs ?? 800;
  const label = opts.label ?? "gemini";

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransient(err)) throw err;
      const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      const reason =
        err instanceof Error
          ? (getCauseCode(err) ?? err.message)
          : "unknown";
      logger(label).info(
        `attempt ${attempt + 1}/${retries + 1} failed (${reason}); retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
