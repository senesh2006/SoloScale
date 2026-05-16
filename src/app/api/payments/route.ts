import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  getAuthenticatedUid,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { createPaymentSchema } from "@/lib/validation/api-inputs";
import { getOwnedEvent, parseLimit } from "@/lib/firestore/queries";

/**
 * GET /api/payments?event_id=...&attendee_id=...&status=...&limit=200
 * Lists payments filtered by event and/or attendee. Requires `event_id` for
 * authorization (caller must own the event).
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const url = new URL(request.url);
  const eventId = url.searchParams.get("event_id");
  const attendeeId = url.searchParams.get("attendee_id");
  const status = url.searchParams.get("status");

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

  let q = db
    .collection(COLLECTIONS.payments)
    .where("event_id", "==", eventId) as FirebaseFirestore.Query;
  if (attendeeId) q = q.where("attendee_id", "==", attendeeId);
  if (status) q = q.where("status", "==", status);

  const limit = parseLimit(url, 500, 500);
  const snap = await q.orderBy("created_at", "desc").limit(limit).get();

  const payments = snap.docs.map((d) =>
    snapshotToObject({ id: d.id, data: () => d.data() }),
  );
  const total_cents = payments.reduce(
    (sum, p) =>
      sum +
      (((p as Record<string, unknown> | null)?.amount_cents as number) ?? 0),
    0,
  );

  return NextResponse.json({
    payments,
    count: payments.length,
    total_cents,
  });
}

/**
 * POST /api/payments
 * Records a payment for a paid event registration. When `status = "succeeded"`,
 * the linked attendee is marked `paid = true` and references the payment.
 *
 * In production, call this from a Stripe webhook (server-to-server) — never
 * trust amount/status from the browser. For now it accepts a JSON body.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const parsed = createPaymentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const db = getAdminDb();
  const userId = await getAuthenticatedUid(request);

  const attendeeRef = db.collection(COLLECTIONS.attendees).doc(input.attendee_id);
  const attendeeSnap = await attendeeRef.get();
  if (!attendeeSnap.exists) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }
  if (attendeeSnap.data()?.event_id !== input.event_id) {
    return NextResponse.json(
      { error: "Attendee does not belong to this event" },
      { status: 400 },
    );
  }

  const eventSnap = await db
    .collection(COLLECTIONS.events)
    .doc(input.event_id)
    .get();
  if (!eventSnap.exists || eventSnap.data()?.published !== true) {
    return NextResponse.json(
      { error: "Event is not open for payments" },
      { status: 403 },
    );
  }

  const paymentRef = db.collection(COLLECTIONS.payments).doc();
  const isSucceeded = input.status === "succeeded";

  const batch = db.batch();
  batch.set(paymentRef, {
    attendee_id: input.attendee_id,
    event_id: input.event_id,
    user_id: userId,
    email: input.email.toLowerCase(),
    amount_cents: input.amount_cents,
    currency: input.currency,
    status: input.status,
    stripe_payment_intent_id: input.stripe_payment_intent_id ?? null,
    refund_reason: null,
    created_at: FieldValue.serverTimestamp(),
  });

  if (isSucceeded) {
    batch.update(attendeeRef, {
      paid: true,
      payment_id: paymentRef.id,
      amount_cents: input.amount_cents,
      currency: input.currency,
    });
  }

  await batch.commit();

  const created = await paymentRef.get();
  return NextResponse.json(
    { payment: snapshotToObject(created) },
    { status: 201 },
  );
}
