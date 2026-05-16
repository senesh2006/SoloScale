import { NextResponse } from "next/server";
import {
  createCampaignEvent,
  getCampaign,
  useMocks,
} from "@/lib/mock-store";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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
  if (!campaign.strategy_json) {
    return NextResponse.json(
      { error: "Strategy not ready yet — generate strategy first" },
      { status: 409 },
    );
  }
  const body = (await _request.json().catch(() => ({}))) as { title?: string };
  const event = createCampaignEvent(id, { title: body.title });
  if (!event) {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }

  return NextResponse.json({ event }, { status: 201 });
}
