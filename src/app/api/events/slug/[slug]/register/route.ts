import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { generateUniqueTicketCode } from "@/lib/firestore/ticket";

type Params = { params: Promise<{ slug: string }> };

/**
 * POST /api/events/slug/[slug]/register
 * Public registration endpoint used by the event landing page. Idempotent on
 * (event_id, lowercased email): returning users get their existing ticket.
 * Bumps `events.attendee_count` atomically.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { slug } = await params;
  const body = await request.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  const emailRaw = String(body?.email ?? "").trim();
  if (!name || !emailRaw) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }
  const email = emailRaw.toLowerCase();
  const metadata =
    body?.metadata && typeof body.metadata === "object"
      ? (Object.fromEntries(
          Object.entries(body.metadata as Record<string, unknown>).map(
            ([k, v]) => [k, String(v)],
          ),
        ) as Record<string, string>)
      : {};

  const db = getAdminDb();
  const eventSnap = await db
    .collection(COLLECTIONS.events)
    .where("slug", "==", slug)
    .where("published", "==", true)
    .limit(1)
    .get();

  if (eventSnap.empty) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const eventDoc = eventSnap.docs[0];
  const eventId = eventDoc.id;
  const eventRef = eventDoc.ref;

  // Idempotent re-registration on same email.
  const existingSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", eventId)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const ref = existingSnap.docs[0].ref;
    if (Object.keys(metadata).length) {
      const current = (existingSnap.docs[0].data().metadata ?? {}) as Record<
        string,
        string
      >;
      await ref.update({ metadata: { ...current, ...metadata } });
    }
    const refreshed = await ref.get();
    const eventFresh = await eventRef.get();
    return NextResponse.json(
      {
        attendee: snapshotToObject(refreshed),
        event: snapshotToObject(eventFresh),
        reused: true,
      },
      { status: 200 },
    );
  }

  const ticketCode = await generateUniqueTicketCode(db);
  const attendeeRef = db.collection(COLLECTIONS.attendees).doc();

  try {
    await db.runTransaction(async (tx) => {
      const eventTxSnap = await tx.get(eventRef);
      if (!eventTxSnap.exists) throw new Error("EVENT_NOT_FOUND");
      const event = eventTxSnap.data()!;
      const price = event.price as
        | { amount_cents: number; currency: string }
        | null
        | undefined;

      tx.set(attendeeRef, {
        event_id: eventId,
        name,
        email,
        ticket_code: ticketCode,
        metadata,
        paid: false,
        payment_id: null,
        amount_cents: price ? price.amount_cents : null,
        currency: price ? price.currency : null,
        created_at: FieldValue.serverTimestamp(),
      });
      tx.update(eventRef, {
        attendee_count: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    console.error("registration failed:", err);
    return NextResponse.json(
      { error: "Failed to register" },
      { status: 500 },
    );
  }

  const created = await attendeeRef.get();
  const eventFresh = await eventRef.get();
  return NextResponse.json(
    {
      attendee: snapshotToObject(created),
      event: snapshotToObject(eventFresh),
    },
    { status: 201 },
  );
}
