import { NextResponse } from "next/server";
import { z } from "zod";
import { refineCampaignStrategy } from "@/services/ai/gemini";
import {
  campaignStrategySchema,
  formatZodError,
} from "@/lib/validation/strategy";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { getOwnedCampaign } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

const refineBodySchema = z.object({
  instruction: z.string().trim().min(1, "instruction is required"),
  current: campaignStrategySchema.optional(),
});

/**
 * POST /api/campaigns/[id]/strategy/refine
 * Asks Gemini to refine the campaign's existing strategy with the user's
 * instruction. Returns the proposed strategy WITHOUT writing — the client
 * decides whether to accept and PATCH it back. Auth: campaign owner.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const owned = await getOwnedCampaign(getAdminDb(), id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }
  const campaign = owned.data;
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
    current:
      parsed.data.current ??
      (campaign.strategy_json as import("@/types/campaign").CampaignStrategy),
    instruction: parsed.data.instruction,
    title: campaign.title as string,
    goal_prompt: campaign.goal_prompt as string,
  });

  // Defensive: Gemini can return invalid JSON despite the schema. Catch it
  // before it reaches the client and corrupts the user's draft.
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
