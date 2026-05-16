import { NextResponse } from "next/server";
import {
  addAsset,
  getCampaign,
  getCampaignAssets,
  startAssetGeneration,
  useMocks,
} from "@/lib/mock-store";
import type { AssetKind, FlyerInput, VoiceoverInput } from "@/types/campaign";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  if (!getCampaign(id)) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ assets: getCampaignAssets(id) });
}

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

  if (campaign.status === "draft") {
    return NextResponse.json(
      { error: "Strategy not ready yet" },
      { status: 409 },
    );
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as {
    kind?: AssetKind;
    flyer?: FlyerInput;
    voice?: VoiceoverInput;
  };

  const assets =
    body?.kind === "flyer" || body?.kind === "voiceover"
      ? addAsset(id, body.kind, { flyer: body.flyer, voice: body.voice })
      : startAssetGeneration(id);

  return NextResponse.json({ assets }, { status: 202 });
}
