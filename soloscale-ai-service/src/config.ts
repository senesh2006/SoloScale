import * as dotenv from "dotenv";

import {
  PIXAZO_FLYER_HEIGHT,
  PIXAZO_FLYER_NUM_STEPS,
  PIXAZO_FLYER_WIDTH,
  PIXAZO_FREE_MAX_NUM_STEPS,
  PIXAZO_FREE_MAX_PIXELS,
} from "./services/pixazo/models";

dotenv.config();

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function firstEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const value = process.env[k];
    if (value != null && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function requiredEnv(prefixedName: string, legacyName: string): string {
  const value = firstEnv(prefixedName, legacyName);
  if (!value) {
    throw new Error(
      `Missing env: ${prefixedName} (legacy: ${legacyName}). See soloscale-ai-service/.env.example`,
    );
  }
  return value;
}

function optionalPair(
  prefixedName: string,
  legacyName: string,
  fallback: string,
): string {
  return firstEnv(prefixedName, legacyName) ?? fallback;
}

function optionalList(prefixedName: string, legacyName: string): string[] {
  const csv = firstEnv(prefixedName, legacyName);
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const port = Number(firstEnv("PORT") ?? "4000");

export const config = {
  port,
  publicBaseUrl: firstEnv("PUBLIC_BASE_URL") ?? `http://localhost:${port}`,
  storageDriver: (firstEnv("STORAGE_DRIVER") ?? "local") as "local",
  gemini: {
    apiKey: requiredEnv(
      "SS_AI_SERVICE_GEMINI_API_KEY",
      "GEMINI_API_KEY",
    ),
    textModel: optionalPair(
      "SS_AI_SERVICE_GEMINI_TEXT_MODEL",
      "GEMINI_TEXT_MODEL",
      "gemini-2.5-flash",
    ),
    imageApiKeys: optionalList(
      "SS_AI_SERVICE_GEMINI_IMAGE_API_KEYS",
      "GEMINI_IMAGE_API_KEYS",
    ),
  },
  elevenlabs: {
    apiKey: requiredEnv(
      "SS_AI_SERVICE_ELEVENLABS_API_KEY",
      "ELEVENLABS_API_KEY",
    ),
    voiceId: optionalPair(
      "SS_AI_SERVICE_ELEVENLABS_VOICE_ID",
      "ELEVENLABS_VOICE_ID",
      "21m00Tcm4TlvDq8ikWAM",
    ),
    modelId: optionalPair(
      "SS_AI_SERVICE_ELEVENLABS_MODEL_ID",
      "ELEVENLABS_MODEL_ID",
      "eleven_multilingual_v2",
    ),
    outputFormat: optionalPair(
      "SS_AI_SERVICE_ELEVENLABS_OUTPUT_FORMAT",
      "ELEVENLABS_OUTPUT_FORMAT",
      "mp3_44100_128",
    ),
  },
  pixazo: {
    apiKey: requiredEnv("SS_AI_SERVICE_PIXAZO_API_KEY", "PIXAZO_API_KEY"),
    width: clampInt(
      Number(
        optionalPair(
          "SS_AI_SERVICE_PIXAZO_FLYER_WIDTH",
          "PIXAZO_FLYER_WIDTH",
          String(PIXAZO_FLYER_WIDTH),
        ),
      ),
      256,
      PIXAZO_FREE_MAX_PIXELS,
    ),
    height: clampInt(
      Number(
        optionalPair(
          "SS_AI_SERVICE_PIXAZO_FLYER_HEIGHT",
          "PIXAZO_FLYER_HEIGHT",
          String(PIXAZO_FLYER_HEIGHT),
        ),
      ),
      256,
      PIXAZO_FREE_MAX_PIXELS,
    ),
    numSteps: clampInt(
      Number(
        optionalPair(
          "SS_AI_SERVICE_PIXAZO_NUM_STEPS",
          "PIXAZO_NUM_STEPS",
          String(PIXAZO_FLYER_NUM_STEPS),
        ),
      ),
      1,
      PIXAZO_FREE_MAX_NUM_STEPS,
    ),
  },
} as const;

export type AppConfig = typeof config;
