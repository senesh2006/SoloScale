import { NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
  useMocks,
  updateCampaignStrategy,
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

  // 1. Create the campaign in "draft" status immediately
  const campaign = createCampaign({ title, goal_prompt });

  // 2. Trigger Gemini generation in the background (fire and forget for now in mock mode)
  // or await if we want to return the full campaign immediately.
  // For the hackathon demo, we await so the UI redirects to a finished state.
  if (process.env.GEMINI_API_KEY) {
    try {
      const strategy = await generateCampaignStrategy({ title, goal_prompt });
      updateCampaignStrategy(campaign.id, strategy);
    } catch (err) {
      console.error("Gemini failed, falling back to mock:", err);
      // Fallback is handled by createCampaign's default timeout if we didn't await
    }
  }

  return NextResponse.json({ campaign: listCampaigns().find(c => c.id === campaign.id) }, { status: 201 });
}
