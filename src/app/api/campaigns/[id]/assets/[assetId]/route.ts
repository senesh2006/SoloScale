import { NextResponse } from "next/server";
import { deleteAsset, getCampaign, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ id: string; assetId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id, assetId } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  if (!getCampaign(id)) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const assets = deleteAsset(id, assetId);
  if (!assets) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ assets });
}
