import { NextResponse } from "next/server";
import { getCampaign, useMocks } from "@/lib/mock-store";
import { generateVoiceScript } from "@/services/ai/gemini";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const campaign = getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { hint?: string };

  const script = await generateVoiceScript({
    title: campaign.title,
    goal_prompt: campaign.goal_prompt,
    hint: body?.hint,
  });

  return NextResponse.json({ script });
}
