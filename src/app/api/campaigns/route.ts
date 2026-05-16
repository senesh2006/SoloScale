import { NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
  useMocks,
  updateCampaignStrategy,
  type CreateCampaignMode,
} from "@/lib/mock-store";
import { generateCampaignStrategy } from "@/services/ai/gemini";

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

  const campaign = createCampaign({ title, goal_prompt, mode });

  if (process.env.GEMINI_API_KEY) {
    try {
      const strategy = await generateCampaignStrategy({ title, goal_prompt });
      const result = updateCampaignStrategy(campaign.id, strategy, {
        withEvent: mode === "all",
      });
      if (!result.ok) {
        console.error("Failed to persist generated strategy:", result.reason);
      }
    } catch (err) {
      console.error("Gemini failed, falling back to mock:", err);
    }
  }

  return NextResponse.json(
    { campaign: listCampaigns().find((c) => c.id === campaign.id) },
    { status: 201 },
  );
}
