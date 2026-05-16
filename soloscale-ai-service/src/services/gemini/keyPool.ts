import { ApiError } from "@google/genai";

import { Logger } from "../../utils/logger";
import { isTransient } from "./withRetry";

/**
 * A round-robin pool of API keys with quota-aware rotation. Used by
 * strategy and image services to fan a single logical request across
 * multiple Gemini API keys that live in separate Google Cloud projects
 * (and therefore have independent free-tier quotas).
 */
export interface KeyPool {
  /** Underlying keys, in the order callers see them numbered (key#1, key#2...). */
  readonly keys: readonly string[];
  /**
   * Returns the next starting index for a fresh request, advancing the
   * shared round-robin cursor. Successive calls visit successive keys.
   */
  nextStart(): number;
  /**
   * Force the cursor to the slot AFTER `idx`. Called after a successful
   * request so the next caller starts on a different key, even if we
   * landed on `idx` via 429 fallback rather than the natural cursor.
   */
  advancePast(idx: number): void;
}

export function createKeyPool(keys: string[]): KeyPool {
  if (keys.length === 0) {
    throw new Error("createKeyPool: keys must not be empty");
  }
  let cursor = 0;
  return {
    keys,
    nextStart() {
      const start = cursor;
      cursor = (cursor + 1) % keys.length;
      return start;
    },
    advancePast(idx) {
      cursor = (idx + 1) % keys.length;
    },
  };
}

/** Mask all but the last 4 chars of a key for log lines. */
export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export interface TryAcrossKeysOptions {
  /** Human-readable label for log lines, e.g. "image" or "strategy". */
  readonly label: string;
  /** Pool to draw keys from. */
  readonly pool: KeyPool;
  /** Logger to emit per-attempt info onto. */
  readonly log: Logger;
}

/**
 * Run `fn(apiKey)` across every key in the pool until one returns
 * successfully. Rotation rules:
 *
 *  - Starts on the pool's next round-robin slot.
 *  - On HTTP 429 ({@link ApiError} with `status === 429`) advance to
 *    the next key and retry the same logical request.
 *  - On a transient network/TLS error (see {@link isTransient}) also
 *    advance to the next key - the AV/middlebox issue might be path-
 *    specific or the SDK's per-key connection pool might be poisoned.
 *  - On any other error (auth, validation, etc.) fail fast - a 401 or
 *    400 won't be cured by trying another key.
 *  - If every key fails, throw a clean aggregate error.
 *
 * On success the pool cursor is advanced past the key that succeeded
 * so the next request starts on a different key, spreading load.
 */
export async function tryAcrossKeys<T>(
  opts: TryAcrossKeysOptions,
  fn: (apiKey: string) => Promise<T>,
): Promise<T> {
  const { label, pool, log } = opts;
  const start = pool.nextStart();
  const failures: string[] = [];
  let sawNon429 = false;

  for (let attempt = 0; attempt < pool.keys.length; attempt++) {
    const idx = (start + attempt) % pool.keys.length;
    const key = pool.keys[idx];
    const keyLabel = `${label}#${idx + 1}/${pool.keys.length} (${maskKey(key)})`;
    log.info(`attempt ${attempt + 1}/${pool.keys.length} using ${keyLabel}`);

    try {
      const result = await fn(key);
      pool.advancePast(idx);
      return result;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        log.info(`${keyLabel} returned HTTP 429, rotating to next key`);
        failures.push(`${keyLabel}: HTTP 429`);
        continue;
      }
      if (isTransient(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        log.info(`${keyLabel} hit transient network error, rotating to next key: ${msg}`);
        failures.push(`${keyLabel}: ${msg}`);
        sawNon429 = true;
        continue;
      }
      throw err;
    }
  }

  // Phrase the aggregate error based on what we actually saw and which label.
  if (sawNon429) {
    throw new Error(
      `All ${pool.keys.length} Gemini ${label} attempts failed (mix of 429 and network errors): ${failures.join("; ")}. Check connectivity to googleapis.com and retry.`,
    );
  }

  // Pure-429: distinguish image (paid-only on free tier) from text models
  // (genuinely free-tier-limited and will recover after daily reset).
  if (label === "image") {
    throw new Error(
      `All ${pool.keys.length} Gemini image API keys hit HTTP 429 for gemini-2.5-flash-image (Nano Banana). Enable Cloud billing on the Google Cloud project or wait for quota reset. Failures: ${failures.join("; ")}.`,
    );
  }
  throw new Error(
    `All ${pool.keys.length} Gemini ${label} API keys hit HTTP 429 (free-tier daily/per-minute limit, e.g. 20 req/day for gemini-2.5-flash). Wait for daily reset, add more keys from separate Google Cloud projects, or upgrade to paid tier. Failures: ${failures.join("; ")}.`,
  );
}
