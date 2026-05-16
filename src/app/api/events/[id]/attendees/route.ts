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
 * GET /api/events/[id]/attendees
 * Returns the attendees registered for an event. Auth required (event owner).
 *
 * Query params:
 *   ?limit=200             (default 500, max 500)
 *   ?with_responses=1      (joins each attendee's form response)
 *   ?paid=true|false       (filter by payment status)
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
  const withResponses = url.searchParams.get("with_responses") === "1";
  const paidFilter = url.searchParams.get("paid");

  let q = db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", id) as FirebaseFirestore.Query;

  if (paidFilter === "true") q = q.where("paid", "==", true);
  else if (paidFilter === "false") q = q.where("paid", "==", false);

  // No `orderBy` to avoid composite index requirement; sort in memory.
  const snap = await q.limit(limit).get();
  const attendees = snap.docs
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

  if (!withResponses || attendees.length === 0) {
    return NextResponse.json({ attendees, count: attendees.length });
  }

  const respSnap = await db
    .collection(COLLECTIONS.form_responses)
    .where("event_id", "==", id)
    .get();
  const responsesByAttendee = new Map<string, unknown>();
  for (const doc of respSnap.docs) {
    responsesByAttendee.set(
      doc.data().attendee_id as string,
      snapshotToObject({ id: doc.id, data: () => doc.data() }),
    );
  }
  const merged = attendees.map((a) => ({
    ...a,
    form_response: responsesByAttendee.get(a.id) ?? null,
  }));

  return NextResponse.json({ attendees: merged, count: merged.length });
}
