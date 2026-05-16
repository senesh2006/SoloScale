import { GoogleGenerativeAIFetchError } from "@google/generative-ai";

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

function isQuotaError(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIFetchError && err.status === 429) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("too many requests");
}

function isRetryableNetwork(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
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
 * Run fn(apiKey) across keys in round-robin order; rotate on 429 or transient errors.
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
      if (isQuotaError(err) || isRetryableNetwork(err)) {
        failures.push(`key#${idx + 1}: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `All ${pool.keys.length} Gemini ${label} API keys failed (quota or network): ${failures.join("; ")}`,
  );
}
