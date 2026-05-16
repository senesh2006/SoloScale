import { NextResponse } from "next/server";
import { getCampaign, useMocks } from "@/lib/mock-store";
import { refineCampaignStrategy } from "@/services/ai/gemini";
import {
  campaignStrategySchema,
  formatZodError,
} from "@/lib/validation/strategy";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const refineBodySchema = z.object({
  instruction: z.string().trim().min(1, "instruction is required"),
  current: campaignStrategySchema.optional(),
});

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
  if (!campaign.strategy_json) {
    return NextResponse.json(
      { error: "No strategy to refine yet" },
      { status: 409 },
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = refineBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const proposed = await refineCampaignStrategy({
    current: parsed.data.current ?? campaign.strategy_json,
    instruction: parsed.data.instruction,
    title: campaign.title,
    goal_prompt: campaign.goal_prompt,
  });

  // Defensive: Gemini can return invalid JSON despite the schema. Catch it before
  // it reaches the client and corrupts their draft.
  const validated = campaignStrategySchema.safeParse(proposed);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: `AI returned an invalid strategy: ${formatZodError(validated.error)}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ strategy: validated.data });
}
