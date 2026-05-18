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
import { updateEventTicketDesignBodySchema } from "@/lib/validation/api-inputs";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/events/[id]/ticket-design
 *
 * Updates only `ticket_design` on an event. Allowed even when the event is
 * published — visuals do not affect stored registrations or form snapshots.
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = updateEventTicketDesignBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid ticket design", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const needsOwnerBackfill = !owned.data.user_id;
  const update: Record<string, unknown> = {
    ticket_design: parsed.data.ticket_design,
    updated_at: FieldValue.serverTimestamp(),
  };
  if (needsOwnerBackfill) {
    update.user_id = userId;
  }

  await db.collection(COLLECTIONS.events).doc(id).update(update);
  const fresh = await db.collection(COLLECTIONS.events).doc(id).get();
  return NextResponse.json({ event: snapshotToObject(fresh) });
}
