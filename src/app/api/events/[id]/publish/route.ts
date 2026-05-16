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
import { getOwnedEvent } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/events/[id]/publish
 *
 * Toggles the `published` flag on an event. The default (no body / empty
 * body) publishes; pass `{ published: false }` to take the event back to
 * draft so it can be edited again.
 *
 * Side-effects:
 *  - Publishing also bumps the parent campaign to `status: "published"`.
 *  - Unpublishing leaves the campaign status untouched (other events under
 *    the same campaign may still be live).
 *
 * Auth: campaign owner.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    published?: unknown;
  };
  const desired = body.published === false ? false : true;

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const eventRef = db.collection(COLLECTIONS.events).doc(id);
  const campaignId = (owned.data.campaign_id as string) ?? null;

  const batch = db.batch();
  batch.update(eventRef, {
    published: desired,
    updated_at: FieldValue.serverTimestamp(),
  });
  if (desired === true && campaignId) {
    batch.update(db.collection(COLLECTIONS.campaigns).doc(campaignId), {
      status: "published",
      updated_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  const fresh = await eventRef.get();
  return NextResponse.json({ event: snapshotToObject(fresh) });
}
