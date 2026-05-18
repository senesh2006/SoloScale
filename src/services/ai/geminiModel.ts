import { resolveGeminiTextModel } from "@/lib/gemini-env";

/** Text model for @google/generative-ai in Next.js (strategy, reports, vision). */
export const GEMINI_TEXT_MODEL = resolveGeminiTextModel();
