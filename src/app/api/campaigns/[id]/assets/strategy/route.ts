import { NextResponse } from "next/server";
import {
  addAsset,
  getCampaign,
  useMocks,
} from "@/lib/mock-store";
import { generateAssetsFromStrategy } from "@/services/ai/gemini";
import type { AssetKind } from "@/types/campaign";

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

  if (campaign.status === "draft" || !campaign.strategy_json) {
    return NextResponse.json(
      { error: "Generate your strategy first" },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: AssetKind | "both";
    preview?: boolean;
  };

  const kind = body.kind ?? "both";
  const preview = body.preview === true;

  const brief = await generateAssetsFromStrategy({
    title: campaign.title,
    goal_prompt: campaign.goal_prompt,
    strategy: campaign.strategy_json,
  });

  if (preview) {
    if (kind === "flyer") return NextResponse.json({ flyer: brief.flyer });
    if (kind === "voiceover") return NextResponse.json({ voice: brief.voice });
    return NextResponse.json(brief);
  }

  if (kind === "flyer") {
    const assets = addAsset(id, "flyer", { flyer: brief.flyer });
    return NextResponse.json({ assets, flyer: brief.flyer }, { status: 202 });
  }

  if (kind === "voiceover") {
    const assets = addAsset(id, "voiceover", { voice: brief.voice });
    return NextResponse.json({ assets, voice: brief.voice }, { status: 202 });
  }

  addAsset(id, "flyer", { flyer: brief.flyer });
  const assets = addAsset(id, "voiceover", { voice: brief.voice });
  return NextResponse.json({ assets, ...brief }, { status: 202 });
}
