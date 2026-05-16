import { NextResponse } from "next/server";
import { createEventForCampaign, getCampaign, useMocks } from "@/lib/mock-store";

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
  if (campaign.event_id) {
    return NextResponse.json(
      { error: "Campaign already has an event page" },
      { status: 409 },
    );
  }

  const event = createEventForCampaign(id);
  if (!event) {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }

  return NextResponse.json({ event }, { status: 201 });
}
