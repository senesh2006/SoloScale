import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/tickets/[code]
 * Public ticket lookup — returns the attendee + their event by ticket code.
 */
export async function GET(_request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { code } = await params;
  const db = getAdminDb();

  const attSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("ticket_code", "==", code)
    .limit(1)
    .get();

  if (attSnap.empty) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const attendeeDoc = attSnap.docs[0];
  const eventId = attendeeDoc.data().event_id as string | undefined;
  if (!eventId) {
    return NextResponse.json(
      { error: "Ticket missing event_id" },
      { status: 500 },
    );
  }

  const eventSnap = await db.collection(COLLECTIONS.events).doc(eventId).get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    attendee: snapshotToObject(attendeeDoc),
    event: snapshotToObject(eventSnap),
  });
}
