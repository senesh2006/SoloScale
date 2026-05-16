import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { getOwnedCampaign } from "@/lib/firestore/queries";
import { serializeFirestore } from "@/lib/firestore/serialize";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id]
 * Returns a single campaign owned by the authenticated user.
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const result = await getOwnedCampaign(getAdminDb(), id, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    campaign: serializeFirestore({ id, ...result.data }),
  });
}
