import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createEventFromStrategy } from "@/lib/firestore/helpers";
import {
  adaptDev1StrategyToDashboard,
  buildAiHeroMeta,
} from "@/lib/adapters/dev1StrategyToDashboard";
import type { CampaignStrategy } from "@/types/campaign";
import type {
  Dev1CampaignResponse,
  Dev1CampaignStrategy,
} from "@/types/dev1-ai";

export type ApplyDev1Mode = "all" | "strategy" | "flyer" | "voice";

/**
 * Persists a Dev1 (`soloscale-ai-service`) campaign response into Firestore:
 *
 * 1. Adapts the Dev1 strategy into the dashboard's `CampaignStrategy` shape
 *    and writes it to `campaigns/{id}.strategy_json`, flipping the campaign
 *    to `strategy_ready`.
 * 2. Stores the recovered hero prompts (flyer prompt + voiceover script) on
 *    `campaigns/{id}.ai_hero` so future regenerations have context.
 * 3. When `mode === "all"`, creates a paired event document from the
 *    strategy's `event_draft` (linking it via `campaigns/{id}.event_id`).
 * 4. When the AI service returned hero assets, writes ready `assets`
 *    documents pointing at the hosted URLs.
 *
 * Returns the dashboard-shaped strategy that was written.
 */
export async function applyDev1ToCampaign(
  db: Firestore,
  campaignId: string,
  input: {
    userId: string;
    title: string;
    goal_prompt: string;
    mode: ApplyDev1Mode;
    dev1Strategy: Dev1CampaignStrategy;
    assets?: Dev1CampaignResponse["assets"];
  },
): Promise<CampaignStrategy> {
  const dashboardStrategy = adaptDev1StrategyToDashboard(input.dev1Strategy, {
    title: input.title,
    goal_prompt: input.goal_prompt,
  });
  const heroMeta = buildAiHeroMeta(input.dev1Strategy);

  const campaignRef = db.collection(COLLECTIONS.campaigns).doc(campaignId);
  await campaignRef.update({
    strategy_json: dashboardStrategy,
    ai_hero: heroMeta,
    status: "strategy_ready",
    updated_at: FieldValue.serverTimestamp(),
  });

  if (input.mode === "all") {
    const fresh = await campaignRef.get();
    const data = fresh.data() ?? {};
    if (!data.event_id) {
      await createEventFromStrategy(db, {
        campaignId,
        title: input.title,
        strategy: dashboardStrategy,
      });
    }
  }

  if (input.mode === "all" && input.assets) {
    const flyerPrompt = input.dev1Strategy.posts.find(
      (p) => p.suggestedFlyerPrompt,
    )?.suggestedFlyerPrompt;
    const voicePrompt = input.dev1Strategy.posts.find(
      (p) => p.suggestedVoiceoverScript,
    )?.suggestedVoiceoverScript;

    // Run asset writes independently and swallow individual failures —
    // we already persisted the strategy + event, and a worker / retry can
    // re-render the assets later. Throwing here would cause the caller's
    // catch block to think the whole apply failed and (possibly) recreate
    // the event, leading to duplicates.
    const writes: Promise<boolean>[] = [];
    if (input.assets.flyer?.url) {
      writes.push(
        writeReadyAsset(db, {
          campaignId,
          userId: input.userId,
          kind: "flyer",
          url: input.assets.flyer.url,
          thumbnail_url: input.assets.flyer.url,
          prompt: flyerPrompt,
          label: "Hero flyer",
        })
          .then(() => true)
          .catch((err) => {
            console.warn(
              `apply-ai: failed to persist hero flyer for ${campaignId}:`,
              err,
            );
            return false;
          }),
      );
    }
    if (input.assets.voiceover?.url) {
      writes.push(
        writeReadyAsset(db, {
          campaignId,
          userId: input.userId,
          kind: "voiceover",
          url: input.assets.voiceover.url,
          prompt: voicePrompt,
          label: "Hero voice-over",
        })
          .then(() => true)
          .catch((err) => {
            console.warn(
              `apply-ai: failed to persist hero voiceover for ${campaignId}:`,
              err,
            );
            return false;
          }),
      );
    }
    const results = await Promise.all(writes);
    if (results.some(Boolean)) {
      await campaignRef
        .update({
          status: "assets_ready",
          updated_at: FieldValue.serverTimestamp(),
        })
        .catch((err) =>
          console.warn(
            `apply-ai: could not bump status for ${campaignId}:`,
            err,
          ),
        );
    }
  }

  return dashboardStrategy;
}

/**
 * Writes a ready (status="ready") asset document. Used when the AI service
 * returns hosted URLs we want to surface immediately, no worker pickup.
 */
export async function writeReadyAsset(
  db: Firestore,
  args: {
    campaignId: string;
    userId: string;
    kind: "flyer" | "voiceover";
    url: string;
    thumbnail_url?: string;
    prompt?: string;
    label?: string;
    voice_id?: string;
  },
): Promise<string> {
  const ref = db.collection(COLLECTIONS.assets).doc();
  await ref.set({
    campaign_id: args.campaignId,
    user_id: args.userId,
    kind: args.kind,
    status: "ready",
    url: args.url,
    thumbnail_url: args.thumbnail_url ?? null,
    error_message: null,
    label: args.label ?? null,
    prompt: args.prompt ?? null,
    voice_id: args.voice_id ?? null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
