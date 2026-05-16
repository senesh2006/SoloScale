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
 * GET /api/form-responses/[id]
 * Returns a single form response. Auth: event owner.
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.form_responses).doc(id).get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "Form response not found" },
      { status: 404 },
    );
  }
  const data = snap.data() ?? {};
  const eventId = data.event_id as string | undefined;
  if (eventId) {
    const owned = await getOwnedEvent(db, eventId, userId);
    if (!owned.ok) {
      return NextResponse.json(
        { error: owned.error },
        { status: owned.status },
      );
    }
  }
  return NextResponse.json({ form_response: snapshotToObject(snap) });
}
