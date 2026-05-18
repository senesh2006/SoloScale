const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";

function looksLikeGoogleAiApiKey(value: string): boolean {
  const s = value.trim();
  return s.startsWith("AIza") && s.length >= 30;
}

function stripSurroundingQuotes(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Model id for `getGenerativeModel({ model })`. Guards against env mistakes
 * where an API key is pasted into GEMINI_TEXT_MODEL / SS_AI_SERVICE_GEMINI_TEXT_MODEL.
 */
export function resolveGeminiTextModel(): string {
  for (const raw of [
    process.env.GEMINI_TEXT_MODEL,
    process.env.SS_AI_SERVICE_GEMINI_TEXT_MODEL,
  ]) {
    if (raw == null || !raw.trim()) continue;
    const v = stripSurroundingQuotes(raw);
    if (!v) continue;
    if (looksLikeGoogleAiApiKey(v)) {
      console.warn(
        "[Gemini] Ignoring GEMINI_TEXT_MODEL / SS_AI_SERVICE_GEMINI_TEXT_MODEL — value looks like an API key. " +
          `Set a model id (e.g. ${DEFAULT_GEMINI_TEXT_MODEL}).`,
      );
      continue;
    }
    return v;
  }
  return DEFAULT_GEMINI_TEXT_MODEL;
}

/**
 * Next.js convention: `GEMINI_*` in `.env.local`.
 * `SS_AI_SERVICE_*` is also accepted so Vercel can match the Express service
 * naming when you import env vars together.
 */
export function resolveGeminiApiKey(): string {
  const fromGemini = process.env.GEMINI_API_KEY?.trim();
  if (fromGemini) return fromGemini;
  return process.env.SS_AI_SERVICE_GEMINI_API_KEY?.trim() ?? "";
}

export function hasResolvedGeminiApiKey(): boolean {
  return resolveGeminiApiKey().length > 0;
}
