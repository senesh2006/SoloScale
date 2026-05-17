import {
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIRequestInputError,
  GoogleGenerativeAIResponseError,
} from "@google/generative-ai";

export interface KeyPool {
  readonly keys: readonly string[];
  nextStart(): number;
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

/** Human-readable line for logs and API error text (status-first when possible). */
export function formatGeminiKeyFailure(err: unknown, keyIndex: number): string {
  if (err instanceof GoogleGenerativeAIFetchError) {
    const status = err.status ?? "?";
    const st = err.statusText ?? "";
    const tail = err.message
      .replace(/^\[GoogleGenerativeAI Error\]: /, "")
      .replace(/^Error fetching from [^\s]+:\s*/, "");
    return `key#${keyIndex}: HTTP ${status} ${st} — ${tail.slice(0, 320)}`.trim();
  }
  if (err instanceof Error) {
    return `key#${keyIndex}: ${err.message.slice(0, 400)}`;
  }
  return `key#${keyIndex}: ${String(err).slice(0, 400)}`;
}

/**
 * Whether to try the next API key. We avoid burning every key when the failure
 * is clearly the same for all (bad model id, bad request shape).
 */
function shouldTryNextGeminiKey(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIResponseError) {
    return false;
  }
  if (err instanceof GoogleGenerativeAIRequestInputError) {
    return false;
  }
  if (err instanceof GoogleGenerativeAIFetchError) {
    const s = err.status ?? 0;
    if (s === 400 || s === 404) {
      return false;
    }
    return true;
  }
  if (err instanceof GoogleGenerativeAIAbortError) {
    return true;
  }
  // Low-level transport failure: fetch() threw before an HTTP response (DNS,
  // TLS, proxy, offline). Same network for all keys, but callers still get one
  // clear aggregated error.
  if (err instanceof GoogleGenerativeAIError) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("too many requests") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("fetch failed") ||
    msg.toLowerCase().includes("network") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("EAI_AGAIN") ||
    msg.includes("certificate") ||
    msg.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE")
  );
}

const poolsBySignature = new Map<string, KeyPool>();

function getKeyPool(keys: string[]): KeyPool {
  const sig = keys.join("\0");
  let pool = poolsBySignature.get(sig);
  if (!pool) {
    pool = createKeyPool(keys);
    poolsBySignature.set(sig, pool);
  }
  return pool;
}

/**
 * Run fn(apiKey) across keys in round-robin order; rotate on retryable errors.
 */
export async function tryAcrossGeminiKeys<T>(
  keys: string[],
  label: string,
  fn: (apiKey: string) => Promise<T>,
): Promise<T> {
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  const pool = getKeyPool(keys);
  const start = pool.nextStart();
  const failures: string[] = [];

  for (let attempt = 0; attempt < pool.keys.length; attempt++) {
    const idx = (start + attempt) % pool.keys.length;
    const key = pool.keys[idx];

    try {
      const result = await fn(key);
      pool.advancePast(idx);
      return result;
    } catch (err) {
      failures.push(formatGeminiKeyFailure(err, idx + 1));
      if (shouldTryNextGeminiKey(err)) {
        continue;
      }
      throw err;
    }
  }

  console.error(
    `[Gemini] All ${pool.keys.length} key(s) failed for ${label}:`,
    failures,
  );

  throw new Error(
    "Ran out of API credits. Please try again later or check billing in Google AI Studio.",
  );
}
