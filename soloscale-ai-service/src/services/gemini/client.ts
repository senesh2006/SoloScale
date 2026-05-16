import { GoogleGenAI } from "@google/genai";

import { config } from "../../config";

const cache = new Map<string, GoogleGenAI>();

/**
 * Returns a GoogleGenAI client for the given API key (or the default
 * `GEMINI_API_KEY` if omitted). One cached instance per distinct key.
 *
 * Multi-key support exists so flyer generation can round-robin across
 * a pool of keys (`GEMINI_IMAGE_API_KEYS`) belonging to different
 * Google Cloud projects, each with its own free-tier quota bucket.
 */
export function getGemini(apiKey?: string): GoogleGenAI {
  const key = apiKey ?? config.gemini.apiKey;
  let client = cache.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
    cache.set(key, client);
  }
  return client;
}
