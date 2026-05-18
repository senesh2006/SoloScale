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
import { generateUniqueTicketCode } from "@/lib/firestore/ticket";
import { createOrganizerTicketSchema } from "@/lib/validation/api-inputs";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/events/[id]/tickets
 *
 * Organizer-only: creates an attendee with a `ticket_code` (or returns the
 * existing row for the same event + email). Works for draft or published
 * events. Optional `mark_paid` for comps / recorded payments.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id: eventId } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const json = await request.json().catch(() => ({}));
  const parsed = createOrganizerTicketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const email = input.email.toLowerCase();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, eventId, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const eventRef = db.collection(COLLECTIONS.events).doc(eventId);

  const extraMeta: Record<string, string> = {
    source: "organizer_ticket",
  };
  if (input.note?.trim()) {
    extraMeta.organizer_note = input.note.trim();
  }

  const existingSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", eventId)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const docRef = existingSnap.docs[0].ref;
    const existingData = existingSnap.docs[0].data();
    const currentMeta =
      (existingData.metadata as Record<string, string> | undefined) ?? {};
    const patch: Record<string, unknown> = {};
    if (Object.keys(extraMeta).length) {
      patch.metadata = { ...currentMeta, ...extraMeta };
    }
    if (input.mark_paid) {
      patch.paid = true;
    }
    if (input.name.trim() !== existingData.name) {
      patch.name = input.name.trim();
    }
    if (Object.keys(patch).length) {
      await docRef.update(patch);
    }
    const refreshed = await docRef.get();
    return NextResponse.json(
      {
        attendee: snapshotToObject(refreshed),
        reused: true,
      },
      { status: 200 },
    );
  }

  const ticketCode = await generateUniqueTicketCode(db);
  const attendeeRef = db.collection(COLLECTIONS.attendees).doc();

  try {
    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) throw new Error("EVENT_NOT_FOUND");
      const event = eventSnap.data()!;
      const price = event.price as
        | { amount_cents: number; currency: string }
        | null
        | undefined;

      const amount_cents = price ? price.amount_cents : null;
      const currency = price ? (price.currency as string) : null;

      tx.set(attendeeRef, {
        event_id: eventId,
        name: input.name.trim(),
        email,
        ticket_code: ticketCode,
        metadata: extraMeta,
        paid: input.mark_paid,
        payment_id: null,
        amount_cents,
        currency,
        created_at: FieldValue.serverTimestamp(),
      });

      tx.update(eventRef, {
        attendee_count: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    console.error("organizer ticket failed:", err);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }

  const created = await attendeeRef.get();
  return NextResponse.json(
    { attendee: snapshotToObject(created), reused: false },
    { status: 201 },
  );
}
