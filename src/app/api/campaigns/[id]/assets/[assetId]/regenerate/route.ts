import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { getOwnedCampaign } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string; assetId: string }> };

/**
 * POST /api/campaigns/[id]/assets/[assetId]/regenerate
 * Resets an asset back to `pending` so a downstream worker can re-render it.
 * Auth: campaign owner.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id, assetId } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const assetRef = db.collection(COLLECTIONS.assets).doc(assetId);
  const assetSnap = await assetRef.get();
  if (!assetSnap.exists || assetSnap.data()?.campaign_id !== id) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await assetRef.update({
    status: "pending",
    url: null,
    thumbnail_url: null,
    error_message: null,
    updated_at: FieldValue.serverTimestamp(),
  });

  const list = await db
    .collection(COLLECTIONS.assets)
    .where("campaign_id", "==", id)
    .get();
  const assets = list.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((a): a is Record<string, unknown> & { id: string } => Boolean(a))
    .sort((a, b) => {
      const at = String(a.created_at ?? "");
      const bt = String(b.created_at ?? "");
      return bt.localeCompare(at);
    });

  return NextResponse.json({ assets }, { status: 202 });
}
