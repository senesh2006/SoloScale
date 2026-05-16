import type { CampaignStrategy } from "@/types/campaign";
import type { Dev1CampaignStrategy, Dev1SavedAsset } from "@/types/dev1-ai";

/**
 * Helper that previously combined a Dev1 AI response with the in-memory
 * `mock-store` to instantly publish a campaign's strategy + assets. The
 * Firestore-only architecture on `testing` removed `mock-store`, so this
 * helper is currently inert.
 *
 * To restore: rewrite to write the strategy onto `campaigns/{id}` and the
 * generated assets into the `assets` collection via `firebase-admin`.
 */
export function applyDev1ToCampaign(
  _campaignId: string,
  _input: {
    title: string;
    goal_prompt: string;
    mode: "all" | "strategy";
    dev1Strategy: Dev1CampaignStrategy;
    assets?: Dev1SavedAsset[];
  },
): CampaignStrategy | null {
  throw new Error(
    "applyDev1ToCampaign is not implemented for Firestore yet. Re-port from `mock-store` if you need the AI-service strategy flow.",
  );
}
