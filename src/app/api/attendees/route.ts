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
import { generateUniqueTicketCode } from "@/lib/firestore/ticket";
import { createAttendeeSchema } from "@/lib/validation/api-inputs";
import { getOwnedEvent, parseLimit } from "@/lib/firestore/queries";

/**
 * GET /api/attendees?event_id=...&limit=200&with_responses=1
 * Lists attendees. Requires `event_id` query param. Auth: event owner.
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const url = new URL(request.url);
  const eventId = url.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json(
      { error: "event_id query param is required" },
      { status: 400 },
    );
  }

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, eventId, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const limit = parseLimit(url, 500, 500);
  const withResponses = url.searchParams.get("with_responses") === "1";

  const snap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", eventId)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  const attendees = snap.docs.map((d) =>
    snapshotToObject<Record<string, unknown>>({
      id: d.id,
      data: () => d.data(),
    }),
  );

  if (!withResponses || attendees.length === 0) {
    return NextResponse.json({ attendees, count: attendees.length });
  }

  const respSnap = await db
    .collection(COLLECTIONS.form_responses)
    .where("event_id", "==", eventId)
    .get();
  const responsesByAttendee = new Map<string, unknown>();
  for (const doc of respSnap.docs) {
    responsesByAttendee.set(
      doc.data().attendee_id as string,
      snapshotToObject({ id: doc.id, data: () => doc.data() }),
    );
  }
  const merged = attendees.map((a) =>
    a ? { ...a, form_response: responsesByAttendee.get(a.id) ?? null } : a,
  );
  return NextResponse.json({ attendees: merged, count: merged.length });
}

/**
 * POST /api/attendees
 * Public endpoint. Registers an attendee for an event.
 *  - Idempotent on `(event_id, lowercased email)`: returns the existing record.
 *  - Bumps `events.attendee_count` in the same transaction.
 *  - Generates a unique `ticket_code`.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const parsed = createAttendeeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const email = input.email.toLowerCase();

  const db = getAdminDb();
  const eventRef = db.collection(COLLECTIONS.events).doc(input.event_id);

  const existingSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", input.event_id)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const docRef = existingSnap.docs[0].ref;
    if (input.metadata) {
      const current = (existingSnap.docs[0].data().metadata ?? {}) as Record<
        string,
        string
      >;
      await docRef.update({
        metadata: { ...current, ...input.metadata },
      });
    }
    const refreshed = await docRef.get();
    return NextResponse.json(
      { attendee: snapshotToObject(refreshed), reused: true },
      { status: 200 },
    );
  }

  const ticketCode = await generateUniqueTicketCode(db);
  const attendeeRef = db.collection(COLLECTIONS.attendees).doc();

  let priceSnapshot: { amount_cents: number | null; currency: string | null } =
    { amount_cents: null, currency: null };

  try {
    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) throw new Error("EVENT_NOT_FOUND");
      const event = eventSnap.data()!;
      if (event.published === false) throw new Error("EVENT_UNPUBLISHED");

      const price = event.price as
        | { amount_cents: number; currency: string }
        | null
        | undefined;
      priceSnapshot = price
        ? { amount_cents: price.amount_cents, currency: price.currency }
        : { amount_cents: null, currency: null };

      tx.set(attendeeRef, {
        event_id: input.event_id,
        name: input.name,
        email,
        ticket_code: ticketCode,
        metadata: input.metadata ?? {},
        paid: false,
        payment_id: null,
        amount_cents: priceSnapshot.amount_cents,
        currency: priceSnapshot.currency,
        created_at: FieldValue.serverTimestamp(),
      });

      tx.update(eventRef, {
        attendee_count: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "EVENT_NOT_FOUND") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (code === "EVENT_UNPUBLISHED") {
      return NextResponse.json(
        { error: "Event is not accepting registrations" },
        { status: 409 },
      );
    }
    console.error("Failed to register attendee:", err);
    return NextResponse.json(
      { error: "Failed to register attendee" },
      { status: 500 },
    );
  }

  const created = await attendeeRef.get();
  return NextResponse.json(
    { attendee: snapshotToObject(created) },
    { status: 201 },
  );
}
