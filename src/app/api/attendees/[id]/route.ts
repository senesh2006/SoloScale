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
import { getOwnedEvent } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/attendees/[id]
 * Returns one attendee with their form response and any payments. Auth required
 * (must own the parent event/campaign).
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const attSnap = await db.collection(COLLECTIONS.attendees).doc(id).get();
  if (!attSnap.exists) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }
  const attData = attSnap.data() ?? {};
  const eventId = attData.event_id as string | undefined;
  if (!eventId) {
    return NextResponse.json(
      { error: "Attendee missing event_id" },
      { status: 500 },
    );
  }

  const owned = await getOwnedEvent(db, eventId, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const [respSnap, paySnap] = await Promise.all([
    db
      .collection(COLLECTIONS.form_responses)
      .where("event_id", "==", eventId)
      .where("attendee_id", "==", id)
      .limit(1)
      .get(),
    db
      .collection(COLLECTIONS.payments)
      .where("attendee_id", "==", id)
      .orderBy("created_at", "desc")
      .get(),
  ]);

  const form_response = respSnap.empty
    ? null
    : snapshotToObject({
        id: respSnap.docs[0].id,
        data: () => respSnap.docs[0].data(),
      });
  const payments = paySnap.docs.map((d) =>
    snapshotToObject({ id: d.id, data: () => d.data() }),
  );

  return NextResponse.json({
    attendee: snapshotToObject(attSnap),
    form_response,
    payments,
  });
}
