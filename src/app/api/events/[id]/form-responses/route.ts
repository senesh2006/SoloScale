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
import { getOwnedEvent, parseLimit } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/events/[id]/form-responses
 * Returns all form responses submitted for an event.
 * Auth: required (event owner).
 *
 * Query params:
 *   ?limit=500   (default 500, max 500)
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url, 500, 500);

  const snap = await db
    .collection(COLLECTIONS.form_responses)
    .where("event_id", "==", id)
    .orderBy("submitted_at", "desc")
    .limit(limit)
    .get();

  const form_responses = snap.docs.map((d) =>
    snapshotToObject({ id: d.id, data: () => d.data() }),
  );

  return NextResponse.json({
    form_responses,
    count: form_responses.length,
  });
}
