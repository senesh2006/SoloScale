/**
 * Gemini API keys for pooled calls (chat, reports) — main key first, then
 * fallbacks. Same key is not repeated. Vision/strategy in `gemini.ts` still use
 * `GEMINI_API_KEY` only.
 */
export function getGeminiApiKeys(): string[] {
  const main = process.env.GEMINI_API_KEY?.trim() ?? "";
  const fallback = (process.env.GEMINI_FALLBACK_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const legacyImagePool = (process.env.GEMINI_IMAGE_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Array.from(
    new Set([main, ...fallback, ...legacyImagePool].filter(Boolean)),
  );
}

export function hasGeminiApiKeys(): boolean {
  return getGeminiApiKeys().length > 0;
}
