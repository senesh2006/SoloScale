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
import { createEventFromStrategy } from "@/lib/firestore/helpers";
import type { CampaignStrategy } from "@/types/campaign";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id]/events
 * Lists every event under this campaign (campaigns can host multiple
 * landing pages — different occurrences, locations, etc.). Auth: owner.
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
    .collection(COLLECTIONS.events)
    .where("campaign_id", "==", id)
    .limit(50)
    .get();

  const events = snap.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((e): e is Record<string, unknown> & { id: string } => Boolean(e))
    .sort((a, b) => {
      const at = String(a.created_at ?? "");
      const bt = String(b.created_at ?? "");
      return at.localeCompare(bt);
    });

  return NextResponse.json({ events });
}

/**
 * POST /api/campaigns/[id]/events
 * Creates an event under this campaign (or reuses the primary one when the
 * body omits `title` and `campaign.event_id` already points at a live doc —
 * same behavior as `POST /api/campaigns/[id]/event`).
 * Auth: owner.
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
      { error: "Generate your strategy before adding events" },
      { status: 409 },
    );
  }

  /**
   * Reuse the campaign's primary event when the caller did not ask for a new
   * landing-page title. Matches `POST /api/campaigns/[id]/event` and prevents
   * duplicates after AI "generate everything" already set `event_id`.
   */
  if (!overrideTitle && campaign.event_id) {
    const existingSnap = await db
      .collection(COLLECTIONS.events)
      .doc(campaign.event_id as string)
      .get();
    if (existingSnap.exists) {
      const data = existingSnap.data();
      if (data?.campaign_id === id) {
        const all = await db
          .collection(COLLECTIONS.events)
          .where("campaign_id", "==", id)
          .get();
        const events = all.docs
          .map((d) =>
            snapshotToObject<Record<string, unknown>>({
              id: d.id,
              data: () => d.data(),
            }),
          )
          .filter((e): e is Record<string, unknown> & { id: string } => Boolean(e))
          .sort((a, b) => {
            const at = String(a.created_at ?? "");
            const bt = String(b.created_at ?? "");
            return at.localeCompare(bt);
          });
        return NextResponse.json({
          event: snapshotToObject(existingSnap),
          events,
        });
      }
    }
  }

  const eventId = await createEventFromStrategy(db, {
    campaignId: id,
    title: overrideTitle || (campaign.title as string) || "Event",
    strategy,
  });

  // Also bump the multi-event list for forwards compatibility.
  await db
    .collection(COLLECTIONS.campaigns)
    .doc(id)
    .update({
      event_ids: FieldValue.arrayUnion(eventId),
      updated_at: FieldValue.serverTimestamp(),
    });

  const created = await db.collection(COLLECTIONS.events).doc(eventId).get();
  const all = await db
    .collection(COLLECTIONS.events)
    .where("campaign_id", "==", id)
    .get();

  const events = all.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((e): e is Record<string, unknown> & { id: string } => Boolean(e));

  return NextResponse.json(
    { event: snapshotToObject(created), events },
    { status: 201 },
  );
}
