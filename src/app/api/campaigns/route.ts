import { NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
  useMocks,
} from "@/lib/mock-store";

export async function GET() {
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Supabase — mock mode disabled" },
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
      { error: "Connect Supabase — mock mode disabled" },
      { status: 501 },
    );
  }

  const campaign = createCampaign({ title, goal_prompt });
  return NextResponse.json({ campaign }, { status: 201 });
}
