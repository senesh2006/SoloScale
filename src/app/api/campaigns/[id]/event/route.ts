import { NextResponse } from "next/server";
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
import { createEventFromStrategy } from "@/lib/firestore/helpers";
import type { CampaignStrategy } from "@/types/campaign";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/event
 * Creates an event document from the campaign's strategy. Idempotent —
 * returns the existing event if `campaign.event_id` is already set, unless
 * the request body provides a `title` (used to spin up additional landing
 * pages under the same campaign).
 * Auth: campaign owner.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const overrideTitle = body.title?.trim();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const campaign = owned.data;
  const strategy = campaign.strategy_json as CampaignStrategy | null | undefined;

  if (!strategy) {
    return NextResponse.json(
      { error: "Strategy not ready yet — generate strategy first" },
      { status: 409 },
    );
  }

  // Without an override title, return the existing event (idempotent).
  if (!overrideTitle && campaign.event_id) {
    const existing = await db
      .collection(COLLECTIONS.events)
      .doc(campaign.event_id as string)
      .get();
    if (existing.exists) {
      return NextResponse.json({ event: snapshotToObject(existing) });
    }
  }

  const eventId = await createEventFromStrategy(db, {
    campaignId: id,
    title: overrideTitle || (campaign.title as string) || "Event",
    strategy,
  });

  const created = await db.collection(COLLECTIONS.events).doc(eventId).get();
  return NextResponse.json({ event: snapshotToObject(created) }, { status: 201 });
}
