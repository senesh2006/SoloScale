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
