import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { AssetKind } from "@/types/campaign";
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

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id]/assets
 * Lists assets for a campaign. Auth: campaign owner.
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const snap = await db
    .collection(COLLECTIONS.assets)
    .where("campaign_id", "==", id)
    .limit(200)
    .get();

  const assets = snap.docs
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

  return NextResponse.json({ assets });
}

/**
 * POST /api/campaigns/[id]/assets
 * Creates pending asset placeholder(s). Pass `kind` for one specific asset,
 * otherwise creates both `flyer` + `voiceover`. A separate background job
 * (or your AI service) flips `status` to `ready` when generation completes.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    kind?: AssetKind;
  };

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const kinds: AssetKind[] =
    body.kind === "flyer" || body.kind === "voiceover"
      ? [body.kind]
      : ["flyer", "voiceover"];

  const created: Array<Record<string, unknown> & { id: string }> = [];
  for (const kind of kinds) {
    const ref = db.collection(COLLECTIONS.assets).doc();
    await ref.set({
      campaign_id: id,
      user_id: userId,
      kind,
      status: "pending",
      url: null,
      thumbnail_url: null,
      error_message: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    const obj = snapshotToObject<Record<string, unknown>>({
      id: snap.id,
      data: () => snap.data(),
    });
    if (obj) created.push(obj);
  }

  return NextResponse.json({ assets: created }, { status: 202 });
}
