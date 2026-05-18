import { resolveGeminiApiKey } from "@/lib/gemini-env";

/**
 * Gemini API keys for pooled calls (chat, reports) — main key first, then
 * fallbacks. Same key is not repeated.
 */
export function getGeminiApiKeys(): string[] {
  const main = resolveGeminiApiKey();
  const fallback = (process.env.GEMINI_FALLBACK_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const legacyImagePool = (process.env.GEMINI_IMAGE_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceImagePool = (process.env.SS_AI_SERVICE_GEMINI_IMAGE_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      [main, ...fallback, ...legacyImagePool, ...serviceImagePool].filter(
        Boolean,
      ),
    ),
  );
}

export function hasGeminiApiKeys(): boolean {
  return getGeminiApiKeys().length > 0;
}
