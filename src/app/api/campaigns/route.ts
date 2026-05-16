import { NextResponse } from "next/server";
import { applyDev1ToCampaign } from "@/lib/apply-ai-to-campaign";
import {
  AI_TIMEOUT,
  aiFetchJson,
  isAiServiceEnabled,
} from "@/lib/ai-service-client";
import { normalizeEventDate } from "@/lib/adapters/dev1StrategyToDashboard";
import {
  createCampaign,
  listCampaigns,
  scheduleDemoStrategy,
  updateCampaignStrategy,
  useMocks,
  type CreateCampaignMode,
} from "@/lib/mock-store";
import { generateCampaignStrategy } from "@/services/ai/gemini";
import type {
  Dev1CampaignResponse,
  Dev1CampaignStrategy,
} from "@/types/dev1-ai";
import type { CampaignStrategy } from "@/types/campaign";

export async function GET() {
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }
  return NextResponse.json({ campaigns: listCampaigns() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = (body.title as string)?.trim() || "New Campaign";
  const goal_prompt = (body.goal_prompt as string)?.trim();
  const rawMode = body.mode as string | undefined;
  const mode: CreateCampaignMode = rawMode === "strategy" ? "strategy" : "all";
  const eventDate = normalizeEventDate(
    (body.event_date as string) ?? (body.eventDate as string),
  );
  const audience = (body.audience as string)?.trim() || undefined;
  const voiceName = (body.voice_name as string)?.trim() || undefined;

  if (!goal_prompt) {
    return NextResponse.json(
      { error: "goal_prompt is required" },
      { status: 400 },
    );
  }

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const deferMock = isAiServiceEnabled() || Boolean(process.env.GEMINI_API_KEY);
  const campaign = createCampaign({
    title,
    goal_prompt,
    mode,
    deferMockStrategy: deferMock,
  });

  let appliedStrategy: CampaignStrategy | null = null;

  if (isAiServiceEnabled()) {
    try {
      if (mode === "all") {
        const data = await aiFetchJson<Dev1CampaignResponse>("/api/campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: goal_prompt,
            eventDate,
            audience,
            voiceName,
          }),
          timeoutMs: AI_TIMEOUT.campaign,
        });
        appliedStrategy = applyDev1ToCampaign(campaign.id, {
          title,
          goal_prompt,
          mode,
          dev1Strategy: data.strategy,
          assets: data.assets,
        });
      } else {
        const data = await aiFetchJson<{ strategy: Dev1CampaignStrategy }>(
          "/api/strategy",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goal: goal_prompt,
              eventDate,
              audience,
            }),
            timeoutMs: AI_TIMEOUT.default,
          },
        );
        appliedStrategy = applyDev1ToCampaign(campaign.id, {
          title,
          goal_prompt,
          mode,
          dev1Strategy: data.strategy,
        });
      }
    } catch (err) {
      console.error("AI service failed, falling back to mock:", err);
    }
  }

  if (!appliedStrategy && process.env.GEMINI_API_KEY) {
    try {
      const strategy = await generateCampaignStrategy({ title, goal_prompt });
      const result = updateCampaignStrategy(campaign.id, strategy, {
        withEvent: mode === "all",
      });
      if (!result.ok) {
        console.error("Failed to persist generated strategy:", result.reason);
      } else {
        appliedStrategy = strategy;
      }
    } catch (err) {
      console.error("Gemini failed, falling back to mock:", err);
    }
  }

  if (!appliedStrategy) {
    scheduleDemoStrategy(campaign.id, mode, title);
  }

  return NextResponse.json(
    { campaign: listCampaigns().find((c) => c.id === campaign.id) },
    { status: 201 },
  );
}
