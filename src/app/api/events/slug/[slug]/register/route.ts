import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { generateUniqueTicketCode } from "@/lib/firestore/ticket";
import {
  answersToMetadata,
  buildAnswersFromFieldValues,
  normalizeAnswers,
} from "@/lib/firestore/form-responses";
import type { FormField } from "@/types/shared";

type Params = { params: Promise<{ slug: string }> };

/**
 * POST /api/events/slug/[slug]/register
 *
 * Public registration endpoint used by the event landing page. Idempotent on
 * `(event_id, lowercased email)`: returning users get their existing ticket.
 *
 * In a single batch / transaction, this writes:
 *   - `attendees/{id}` (new or reused, with metadata cache)
 *   - `form_responses/{id}` (new or merged, idempotent on `(event_id, attendee_id)`)
 *   - increments `events.attendee_count` (only on a brand-new attendee)
 *
 * Request body:
 *   {
 *     name: string,
 *     email: string,
 *     answers?: FormResponseAnswer[],          // structured (preferred)
 *     field_values?: Record<field_id, value>,  // alternative (id-keyed)
 *     metadata?: Record<string, string>,       // free-form extras (paid flag etc)
 *   }
 *
 * `answers`/`field_values` are validated against the live event's
 * `form_fields`; unknown ids are dropped, types are coerced, and the
 * authoritative `label`/`type` are snapshotted from the event.
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

  const extraMetadata =
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
  const eventData = eventDoc.data();
  const eventId = eventDoc.id;
  const eventRef = eventDoc.ref;
  const eventOwnerId = (eventData.user_id as string | undefined) ?? null;
  const campaignId = (eventData.campaign_id as string | undefined) ?? "";
  const formFields = (eventData.form_fields as FormField[] | undefined) ?? [];

  // Build authoritative answers from either `answers` or `field_values`.
  const answers =
    body?.answers !== undefined
      ? normalizeAnswers(formFields, body.answers)
      : body?.field_values && typeof body.field_values === "object"
        ? buildAnswersFromFieldValues(
            formFields,
            body.field_values as Record<string, unknown>,
          )
        : [];

  const fieldMetadata = answersToMetadata(answers);
  const mergedMetadata: Record<string, string> = {
    ...fieldMetadata,
    ...extraMetadata,
  };

  // ----------- Returning attendee (idempotent path) -----------
  const existingSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", eventId)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const attendeeDoc = existingSnap.docs[0];
    const attendeeRef = attendeeDoc.ref;
    const existingMetadata =
      (attendeeDoc.data().metadata as Record<string, string> | undefined) ??
      {};

    // Look up an existing form_response for this (event, attendee).
    const responseSnap = await db
      .collection(COLLECTIONS.form_responses)
      .where("event_id", "==", eventId)
      .where("attendee_id", "==", attendeeDoc.id)
      .limit(1)
      .get();
    const responseRef = responseSnap.empty
      ? db.collection(COLLECTIONS.form_responses).doc()
      : responseSnap.docs[0].ref;
    const isNewResponse = responseSnap.empty;

    const batch = db.batch();
    if (Object.keys(mergedMetadata).length) {
      batch.update(attendeeRef, {
        metadata: { ...existingMetadata, ...mergedMetadata },
      });
    }
    if (answers.length || isNewResponse) {
      batch.set(
        responseRef,
        {
          event_id: eventId,
          campaign_id: campaignId,
          attendee_id: attendeeDoc.id,
          user_id: eventOwnerId,
          email,
          name,
          answers,
          form_version: 1,
          ...(isNewResponse
            ? { submitted_at: FieldValue.serverTimestamp() }
            : {}),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();

    const refreshed = await attendeeRef.get();
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

  // ----------- Brand-new attendee -----------
  const ticketCode = await generateUniqueTicketCode(db);
  const attendeeRef = db.collection(COLLECTIONS.attendees).doc();
  const responseRef = db.collection(COLLECTIONS.form_responses).doc();

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
        metadata: mergedMetadata,
        paid: false,
        payment_id: null,
        amount_cents: price ? price.amount_cents : null,
        currency: price ? price.currency : null,
        created_at: FieldValue.serverTimestamp(),
      });

      tx.set(responseRef, {
        event_id: eventId,
        campaign_id: campaignId,
        attendee_id: attendeeRef.id,
        user_id: eventOwnerId,
        email,
        name,
        answers,
        form_version: 1,
        submitted_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
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
