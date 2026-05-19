import { NextResponse } from "next/server";
import { suggestCampaignStrategy } from "@/lib/campaign/suggest-strategy";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { suggestStrategySchema } from "@/lib/validation/api-inputs";
import { formatZodError } from "@/lib/validation/strategy";

/**
 * POST /api/campaigns/suggest-strategy
 * Returns an AI-generated strategy draft (no campaign write, no assets).
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const raw = await request.json().catch(() => null);
  const parsed = suggestStrategySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const strategy = await suggestCampaignStrategy(parsed.data);
    return NextResponse.json({ strategy });
  } catch (err) {
    console.error("suggest-strategy failed:", err);
    const message =
      err instanceof Error ? err.message : "Could not suggest a strategy";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
