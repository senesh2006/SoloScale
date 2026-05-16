import { Schema, Type } from "@google/genai";

import { config } from "../../config";
import {
  CampaignStrategy,
  CampaignStrategySchema,
} from "../../schemas/campaign";
import { StrategyRequest } from "../../schemas/requests";
import { fmtBytes, logger } from "../../utils/logger";
import {
  STRATEGY_SYSTEM_INSTRUCTION,
  buildStrategyUserPrompt,
} from "../prompts/strategyPrompt";
import { getGemini } from "./client";
import { createKeyPool, tryAcrossKeys } from "./keyPool";
import { withRetry } from "./withRetry";

/**
 * Mirror of CampaignStrategySchema as a Gemini Schema. Keep these two
 * in sync. The Gemini API supports a constrained OpenAPI subset.
 */
const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ["goal", "durationDays", "posts"],
  propertyOrdering: ["goal", "durationDays", "event", "posts"],
  properties: {
    goal: { type: Type.STRING },
    durationDays: { type: Type.INTEGER },
    event: {
      type: Type.OBJECT,
      nullable: true,
      required: ["title", "description", "dateISO", "format"],
      propertyOrdering: ["title", "description", "dateISO", "format"],
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        dateISO: { type: Type.STRING, description: "ISO-8601 date YYYY-MM-DD" },
        format: {
          type: Type.STRING,
          enum: ["virtual", "in-person", "hybrid"],
        },
      },
    },
    posts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["day", "dateISO", "platform", "type", "headline", "body", "hashtags"],
        propertyOrdering: [
          "day",
          "dateISO",
          "platform",
          "type",
          "headline",
          "body",
          "hashtags",
          "cta",
          "suggestedFlyerPrompt",
          "suggestedVoiceoverScript",
        ],
        properties: {
          day: { type: Type.INTEGER },
          dateISO: {
            type: Type.STRING,
            description: "ISO-8601 date YYYY-MM-DD",
          },
          platform: {
            type: Type.STRING,
            enum: ["twitter", "linkedin", "instagram", "reel"],
          },
          type: {
            type: Type.STRING,
            enum: ["text", "image", "reel"],
          },
          headline: { type: Type.STRING },
          body: { type: Type.STRING },
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          cta: {
            type: Type.STRING,
            nullable: true,
            description: "Clear call-to-action (register, save, link in bio, etc.)",
          },
          suggestedFlyerPrompt: {
            type: Type.STRING,
            nullable: true,
            description:
              "Visual art direction only: subject, colors, mood, composition. No headline text.",
          },
          suggestedVoiceoverScript: {
            type: Type.STRING,
            nullable: true,
            description:
              "15-30 second spoken Reel script (~40-80 words). Natural speech, hook then CTA.",
          },
        },
      },
    },
  },
};

/**
 * Pool of API keys used for strategy/text generation. Tries the main
 * `GEMINI_API_KEY` first (preserves the "teammates' keys are only for
 * images" intent), then falls back to the image pool keys if the main
 * key returns HTTP 429. Strategy is one call per campaign, so this
 * barely touches teammates' quota - it's purely a resilience net for
 * when the main key's tight free-tier daily limit (20 req/day on
 * gemini-2.5-flash) is exhausted.
 *
 * Duplicates are removed in case a teammate key was also set as the
 * main key.
 */
export const STRATEGY_KEY_POOL = createKeyPool(
  Array.from(new Set([config.gemini.apiKey, ...config.gemini.imageApiKeys])),
);

export async function generateStrategy(
  input: StrategyRequest,
): Promise<CampaignStrategy> {
  const log = logger("strategy");
  const prompt = buildStrategyUserPrompt(input);
  const poolSize = STRATEGY_KEY_POOL.keys.length;
  log.start(
    `calling ${config.gemini.textModel} (prompt ${fmtBytes(prompt.length)}, structured JSON, days=${input.durationDays ?? 14}, pool=${poolSize} key${poolSize === 1 ? "" : "s"})`,
  );

  const response = await tryAcrossKeys(
    { label: "strategy", pool: STRATEGY_KEY_POOL, log },
    (apiKey) =>
      withRetry(
        () =>
          getGemini(apiKey).models.generateContent({
            model: config.gemini.textModel,
            contents: prompt,
            config: {
              systemInstruction: STRATEGY_SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              temperature: 0.85,
            },
          }),
        // 1 retry per key (= 2 attempts) so a fully-stuck network path
        // fails over to the next pool key in ~3 min instead of ~4.5 min.
        { label: "gemini.strategy", retries: 1 },
      ),
  );

  const text = response.text;
  if (!text || text.trim() === "") {
    log.fail("empty response from Gemini");
    throw new Error("Gemini returned an empty strategy response");
  }
  log.info(`received ${fmtBytes(text.length)} of JSON, parsing`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    log.fail(`JSON parse failed: ${(err as Error).message}`);
    throw new Error(
      `Gemini returned invalid JSON for strategy: ${(err as Error).message}`,
    );
  }

  const validated = CampaignStrategySchema.safeParse(parsed);
  if (!validated.success) {
    log.fail(`schema validation failed: ${validated.error.issues.length} issue(s)`);
    throw new Error(
      `Strategy JSON failed schema validation: ${validated.error.message}`,
    );
  }

  log.ok(
    `${validated.data.posts.length} posts, ${validated.data.durationDays} days${validated.data.event ? `, event="${validated.data.event.title}"` : ""}`,
  );
  return validated.data;
}
