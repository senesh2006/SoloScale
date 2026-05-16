import { NextResponse } from "next/server";
import { getCampaign, updateCampaignStrategy, useMocks } from "@/lib/mock-store";
import {
  campaignStrategySchema,
  formatZodError,
} from "@/lib/validation/strategy";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchBodySchema = z.object({
  strategy: campaignStrategySchema,
  if_updated_at: z.string().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
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

  const raw = await request.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const result = updateCampaignStrategy(id, parsed.data.strategy, {
    ifUpdatedAt: parsed.data.if_updated_at,
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return NextResponse.json(
        {
          error:
            "This strategy was edited somewhere else. Reload to see the latest version.",
          campaign: result.current,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign: result.campaign });
}
