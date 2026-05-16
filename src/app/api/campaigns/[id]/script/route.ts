import { NextResponse } from "next/server";
import { generateVoiceScript } from "@/services/ai/gemini";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { getOwnedCampaign } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/script
 * Generates a voiceover script via Gemini using the campaign's title and
 * goal prompt as context. Auth: campaign owner.
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

  const body = (await request.json().catch(() => ({}))) as { hint?: string };

  const script = await generateVoiceScript({
    title: campaign.title as string,
    goal_prompt: campaign.goal_prompt as string,
    hint: body?.hint,
  });

  return NextResponse.json({ script });
}
