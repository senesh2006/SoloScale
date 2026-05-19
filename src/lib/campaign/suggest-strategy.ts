import {
  adaptDev1StrategyToDashboard,
  normalizeEventDate,
} from "@/lib/adapters/dev1StrategyToDashboard";
import {
  aiFetchJson,
  AI_TIMEOUT,
  isAiServiceEnabled,
} from "@/lib/ai-service-client";
import { hasResolvedGeminiApiKey } from "@/lib/gemini-env";
import {
  campaignStrategySchema,
  formatZodError,
} from "@/lib/validation/strategy";
import { generateCampaignStrategy } from "@/services/ai/gemini";
import type { CampaignStrategy } from "@/types/campaign";
import type { Dev1CampaignStrategy } from "@/types/dev1-ai";

export type SuggestStrategyInput = {
  title: string;
  goal_prompt: string;
  strategy_horizon_days?: number;
  audience?: string | null;
  event_date?: string | null;
};

/**
 * Generates a campaign strategy (timeline + event draft) without creating
 * flyer/voiceover assets. Used by non-AI campaign creation.
 */
export async function suggestCampaignStrategy(
  input: SuggestStrategyInput,
): Promise<CampaignStrategy> {
  const title = input.title.trim() || "New campaign";
  const goal = input.goal_prompt.trim();
  const horizonDays = Math.min(
    90,
    Math.max(1, input.strategy_horizon_days ?? 14),
  );
  const eventDateNormalized = normalizeEventDate(input.event_date ?? null);

  let strategy: CampaignStrategy | null = null;

  if (isAiServiceEnabled()) {
    try {
      const data = await aiFetchJson<{ strategy: Dev1CampaignStrategy }>(
        "/api/strategy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal,
            eventDate: eventDateNormalized,
            audience: input.audience ?? undefined,
            durationDays: horizonDays,
          }),
          timeoutMs: AI_TIMEOUT.default,
        },
      );
      strategy = adaptDev1StrategyToDashboard(data.strategy, {
        title,
        goal_prompt: goal,
      });
    } catch (err) {
      console.error("AI service strategy suggest failed — falling back:", err);
    }
  }

  if (!strategy && hasResolvedGeminiApiKey()) {
    strategy = await generateCampaignStrategy({
      title,
      goal_prompt: goal,
      horizonDays,
    });
  }

  if (!strategy) {
    throw new Error(
      "AI is not configured. Set AI_SERVICE_URL or a Gemini API key to suggest a strategy.",
    );
  }

  const validated = campaignStrategySchema.safeParse(strategy);
  if (!validated.success) {
    throw new Error(
      `AI returned an invalid strategy: ${formatZodError(validated.error)}`,
    );
  }

  return validated.data;
}
