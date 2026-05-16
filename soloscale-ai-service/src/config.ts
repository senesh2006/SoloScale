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

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function optionalList(name: string): string[] {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const port = Number(optional("PORT", "4000"));

export const config = {
  port,
  publicBaseUrl: optional("PUBLIC_BASE_URL", `http://localhost:${port}`),
  storageDriver: optional("STORAGE_DRIVER", "local") as "local",
  gemini: {
    apiKey: required("GEMINI_API_KEY"),
    textModel: optional("GEMINI_TEXT_MODEL", "gemini-2.5-flash"),
    /** Optional pool of API keys for image gen. Empty = use main apiKey. */
    imageApiKeys: optionalList("GEMINI_IMAGE_API_KEYS"),
  },
  elevenlabs: {
    apiKey: required("ELEVENLABS_API_KEY"),
    voiceId: optional("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"), // Rachel
    modelId: optional("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
    outputFormat: optional("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128"),
  },
  /**
   * Flyer images — Pixazo Flux 1 Schnell only (free tier, $0/image).
   * Width/height are clamped to PIXAZO_FREE_MAX_PIXELS so paid resolutions
   * cannot be requested via env by mistake.
   */
  pixazo: {
    apiKey: required("PIXAZO_API_KEY"),
    width: clampInt(
      Number(optional("PIXAZO_FLYER_WIDTH", String(PIXAZO_FLYER_WIDTH))),
      256,
      PIXAZO_FREE_MAX_PIXELS,
    ),
    height: clampInt(
      Number(optional("PIXAZO_FLYER_HEIGHT", String(PIXAZO_FLYER_HEIGHT))),
      256,
      PIXAZO_FREE_MAX_PIXELS,
    ),
    numSteps: clampInt(
      Number(optional("PIXAZO_NUM_STEPS", String(PIXAZO_FLYER_NUM_STEPS))),
      1,
      PIXAZO_FREE_MAX_NUM_STEPS,
    ),
  },
} as const;

export type AppConfig = typeof config;
