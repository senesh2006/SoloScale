import { Router } from "express";

import { ApiError } from "@google/genai";

import { CampaignPost, CampaignStrategy } from "../schemas/campaign";
import { CampaignRequestSchema } from "../schemas/requests";
import {
  VoiceoverAsset,
  generateVoiceover,
} from "../services/elevenlabs/ttsService";
import { generateFlyer } from "../services/pixazo/imageService";
import { generateStrategy } from "../services/gemini/strategyService";
import {
  flyerPromptFor,
  voiceoverScriptFor,
} from "../services/prompts/campaignAssets";
import { SavedAsset } from "../storage";
import { asyncHandler } from "../utils/asyncHandler";
import { logger } from "../utils/logger";

/**
 * Turn the various error shapes Gemini / undici / our own code can throw
 * into a single, short, demo-safe string. Strips JSON dumps, surfaces
 * the real cause behind Node's generic "fetch failed", and tags
 * recognisable conditions (quota, safety, etc.).
 */
function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return "Gemini quota exceeded (HTTP 429). Free-tier image/TTS models have low per-minute and per-day limits. Wait ~60s and retry, or use a paid key.";
    }
    return `Gemini API error ${err.status ?? ""}: ${err.message}`.trim();
  }
  if (err instanceof Error) {
    let msg = err.message;
    // Node 22 wraps low-level fetch failures as "fetch failed" with the real
    // reason on .cause. Surface that so the UI shows something actionable.
    const cause = (err as { cause?: unknown }).cause;
    if (msg === "fetch failed" && cause instanceof Error) {
      msg = `fetch failed: ${cause.message}`;
    }
    // If the message is actually a JSON string (some SDK paths do this), try
    // to extract just the inner .error.message.
    if (msg.startsWith("{") && msg.includes('"message"')) {
      try {
        const parsed = JSON.parse(msg);
        const inner =
          parsed?.error?.message ?? parsed?.message ?? null;
        if (typeof inner === "string") msg = inner;
      } catch {
        /* leave as-is */
      }
    }
    if (msg.length > 240) msg = msg.slice(0, 237) + "...";
    return msg;
  }
  return "Unknown error";
}

export const campaignRouter = Router();

interface HeroPicks {
  flyerPost: CampaignPost | null;
  voiceoverPost: CampaignPost | null;
}

function pickHeroPosts(strategy: CampaignStrategy): HeroPicks {
  const flyerPost =
    strategy.posts.find((p) => p.suggestedFlyerPrompt) ??
    strategy.posts.find((p) => p.type === "image") ??
    strategy.posts[0] ??
    null;

  const voiceoverPost =
    strategy.posts.find((p) => p.suggestedVoiceoverScript) ??
    strategy.posts.find((p) => p.type === "reel") ??
    strategy.posts[0] ??
    null;

  return { flyerPost, voiceoverPost };
}

campaignRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = CampaignRequestSchema.parse(req.body);
    const log = logger("campaign");
    log.start(`goal="${input.goal.slice(0, 60)}${input.goal.length > 60 ? "..." : ""}"`);

    log.info("phase 1/3: generating strategy");
    const strategy = await generateStrategy(input);

    log.info("phase 2/3: picking hero posts for flyer + voice-over");
    const { flyerPost, voiceoverPost } = pickHeroPosts(strategy);
    log.info(
      `hero flyer = day ${flyerPost?.day ?? "?"} (${flyerPost?.platform ?? "?"}), ` +
        `hero voiceover = day ${voiceoverPost?.day ?? "?"} (${voiceoverPost?.platform ?? "?"})`,
    );

    const flyerInput = flyerPost
      ? flyerPromptFor(flyerPost, strategy)
      : null;
    const voiceoverInput = voiceoverPost
      ? {
          script: voiceoverScriptFor(voiceoverPost),
          voiceName: input.voiceName,
        }
      : null;

    log.info("phase 3/3: generating flyer + voice-over in parallel");
    const [flyerResult, voiceoverResult] = await Promise.allSettled([
      flyerInput ? generateFlyer(flyerInput) : Promise.resolve(null),
      voiceoverInput ? generateVoiceover(voiceoverInput) : Promise.resolve(null),
    ]);

    const flyer =
      flyerResult.status === "fulfilled" ? (flyerResult.value as SavedAsset | null) : null;
    const flyerError =
      flyerResult.status === "rejected" ? friendlyError(flyerResult.reason) : undefined;

    const voiceover =
      voiceoverResult.status === "fulfilled"
        ? (voiceoverResult.value as VoiceoverAsset | null)
        : null;
    const voiceoverError =
      voiceoverResult.status === "rejected"
        ? friendlyError(voiceoverResult.reason)
        : undefined;

    const flyerSym = flyer ? "ok" : "fail";
    const voiceSym = voiceover ? "ok" : "fail";
    log.ok(
      `strategy + flyer (${flyerSym}) + voice-over (${voiceSym})`,
    );

    res.json({
      strategy,
      heroes: {
        flyerPostDay: flyerPost?.day ?? null,
        voiceoverPostDay: voiceoverPost?.day ?? null,
      },
      assets: {
        flyer,
        flyerError,
        voiceover,
        voiceoverError,
      },
    });
  }),
);
