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
import { getOwnedCampaign, parseLimit } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id]/attendees
 * Returns all attendees registered to the campaign's event(s).
 * Auth: required (campaign owner).
 *
 * Query params:
 *   ?limit=200          (default 500, max 500)
 *   ?with_responses=1   (joins each attendee's form response)
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

  const eventId = owned.data.event_id as string | null;
  if (!eventId) {
    return NextResponse.json({ attendees: [], count: 0 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url, 500, 500);
  const withResponses = url.searchParams.get("with_responses") === "1";

  const attSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", eventId)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  const attendees = attSnap.docs.map((d) =>
    snapshotToObject<Record<string, unknown>>({
      id: d.id,
      data: () => d.data(),
    }),
  );

  if (!withResponses || attendees.length === 0) {
    return NextResponse.json({ attendees, count: attendees.length });
  }

  // Join: pull form_responses for these attendees in one query.
  const respSnap = await db
    .collection(COLLECTIONS.form_responses)
    .where("event_id", "==", eventId)
    .get();
  const responsesByAttendee = new Map<string, unknown>();
  for (const doc of respSnap.docs) {
    const data = doc.data();
    responsesByAttendee.set(
      data.attendee_id as string,
      snapshotToObject({ id: doc.id, data: () => data }),
    );
  }

  const merged = attendees.map((a) =>
    a
      ? { ...a, form_response: responsesByAttendee.get(a.id) ?? null }
      : a,
  );

  return NextResponse.json({ attendees: merged, count: merged.length });
}
