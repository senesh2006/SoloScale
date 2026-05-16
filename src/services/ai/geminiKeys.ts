/**
 * Gemini API keys for in-app calls (reports, strategy fallback, vision).
 * Main key first, then comma-separated extras from GEMINI_IMAGE_API_KEYS.
 */
export function getGeminiApiKeys(): string[] {
  const main = process.env.GEMINI_API_KEY?.trim() ?? "";
  const extras = (process.env.GEMINI_IMAGE_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Array.from(new Set([main, ...extras].filter(Boolean)));
}

export function hasGeminiApiKeys(): boolean {
  return getGeminiApiKeys().length > 0;
}
