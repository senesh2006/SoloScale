import { NextResponse } from "next/server";
import { getCampaign, useMocks } from "@/lib/mock-store";
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
 * GET /api/campaigns/[id]
 * Returns a single campaign. Mock mode reads from the in-memory store;
 * otherwise enforces ownership against Firebase Auth.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  if (useMocks()) {
    const campaign = getCampaign(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ campaign });
  }

  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const result = await getOwnedCampaign(getAdminDb(), id, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ campaign: { id, ...result.data } });
}
