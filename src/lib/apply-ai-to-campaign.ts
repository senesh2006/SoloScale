import {
  adaptDev1StrategyToDashboard,
  buildAiHeroMeta,
} from "@/lib/adapters/dev1StrategyToDashboard";
import {
  addReadyAsset,
  setAiHeroMeta,
  updateCampaignStrategy,
  type CreateCampaignMode,
} from "@/lib/mock-store";
import type { CampaignStrategy } from "@/types/campaign";
import type {
  Dev1CampaignResponse,
  Dev1CampaignStrategy,
} from "@/types/dev1-ai";

export function applyDev1ToCampaign(
  campaignId: string,
  input: {
    title: string;
    goal_prompt: string;
    mode: CreateCampaignMode;
    dev1Strategy: Dev1CampaignStrategy;
    assets?: Dev1CampaignResponse["assets"];
  },
): CampaignStrategy {
  const dashboardStrategy = adaptDev1StrategyToDashboard(input.dev1Strategy, {
    title: input.title,
    goal_prompt: input.goal_prompt,
  });

  setAiHeroMeta(campaignId, buildAiHeroMeta(input.dev1Strategy));

  updateCampaignStrategy(campaignId, dashboardStrategy, {
    withEvent: input.mode === "all",
  });

  if (input.mode === "all" && input.assets) {
    const { flyer, voiceover } = input.assets;
    if (flyer?.url) {
      addReadyAsset(campaignId, "flyer", {
        url: flyer.url,
        thumbnail_url: flyer.url,
        prompt: input.dev1Strategy.posts.find((p) => p.suggestedFlyerPrompt)
          ?.suggestedFlyerPrompt,
        label: "Hero flyer",
      });
    }
    if (voiceover?.url) {
      addReadyAsset(campaignId, "voiceover", {
        url: voiceover.url,
        prompt: input.dev1Strategy.posts.find(
          (p) => p.suggestedVoiceoverScript,
        )?.suggestedVoiceoverScript,
        label: "Hero voice-over",
      });
    }
  }

  return dashboardStrategy;
}
