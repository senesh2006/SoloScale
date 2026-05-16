import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  addAsset,
  getCampaign,
  getCampaignAssets,
  startAssetGeneration,
  useMocks,
} from "@/lib/mock-store";
import type { AssetKind, FlyerInput, VoiceoverInput } from "@/types/campaign";
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
 * Returns the assets for a campaign. Mock mode reads in-memory; Firestore
 * mode reads from `assets` collection (where campaign_id == id).
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  if (useMocks()) {
    if (!getCampaign(id)) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ assets: getCampaignAssets(id) });
  }

  if (!isFirebaseConfigured()) return firebaseNotConfigured();

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
 * Creates a placeholder asset for the campaign. Mock mode triggers fake
 * generation; Firestore mode writes a `pending` asset doc that a background
 * job (or your AI service) will later flip to `ready`.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const body = (await request
    .json()
    .catch(() => ({}))) as {
    kind?: AssetKind;
    flyer?: FlyerInput;
    voice?: VoiceoverInput;
  };

  if (useMocks()) {
    const campaign = getCampaign(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status === "draft") {
      return NextResponse.json(
        { error: "Strategy not ready yet" },
        { status: 409 },
      );
    }

    const assets =
      body?.kind === "flyer" || body?.kind === "voiceover"
        ? addAsset(id, body.kind, { flyer: body.flyer, voice: body.voice })
        : startAssetGeneration(id);

    return NextResponse.json({ assets }, { status: 202 });
  }

  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

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
