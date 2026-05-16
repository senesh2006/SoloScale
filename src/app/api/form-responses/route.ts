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
import { createFormResponseSchema } from "@/lib/validation/api-inputs";
import {
  getOwnedCampaign,
  getOwnedEvent,
  parseLimit,
} from "@/lib/firestore/queries";

/**
 * GET /api/form-responses?event_id=...|campaign_id=...|attendee_id=...&limit=200
 * Lists form responses. Requires one of `event_id`, `campaign_id`, or
 * `attendee_id`. Auth: required (campaign/event owner).
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const url = new URL(request.url);
  const eventId = url.searchParams.get("event_id");
  const campaignId = url.searchParams.get("campaign_id");
  const attendeeId = url.searchParams.get("attendee_id");

  if (!eventId && !campaignId && !attendeeId) {
    return NextResponse.json(
      {
        error:
          "One of event_id, campaign_id, or attendee_id is required",
      },
      { status: 400 },
    );
  }

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();

  if (campaignId) {
    const owned = await getOwnedCampaign(db, campaignId, userId);
    if (!owned.ok) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }
  } else if (eventId) {
    const owned = await getOwnedEvent(db, eventId, userId);
    if (!owned.ok) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }
  }

  let q = db.collection(COLLECTIONS.form_responses) as FirebaseFirestore.Query;
  if (eventId) q = q.where("event_id", "==", eventId);
  if (campaignId) q = q.where("campaign_id", "==", campaignId);
  if (attendeeId) q = q.where("attendee_id", "==", attendeeId);

  const limit = parseLimit(url, 500, 500);
  const snap = await q
    .orderBy("submitted_at", "desc")
    .limit(limit)
    .get();

  // For attendee_id-only queries, also confirm the caller owns the parent event.
  if (!eventId && !campaignId && attendeeId && !snap.empty) {
    const firstEventId = snap.docs[0].data().event_id as string | undefined;
    if (firstEventId) {
      const owned = await getOwnedEvent(db, firstEventId, userId);
      if (!owned.ok) {
        return NextResponse.json(
          { error: owned.error },
          { status: owned.status },
        );
      }
    }
  }

  const form_responses = snap.docs.map((d) =>
    snapshotToObject({ id: d.id, data: () => d.data() }),
  );
  return NextResponse.json({
    form_responses,
    count: form_responses.length,
  });
}

/**
 * POST /api/form-responses
 * Public endpoint. Submits an attendee's answers for an event's registration form.
 *  - Idempotent on `(event_id, attendee_id)`: re-submits update the existing doc.
 *  - Mirrors `answers` to `attendees.metadata` (flat string lookup) in one batch.
 *  - Snapshots `label`/`type` per answer so old responses stay readable.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const parsed = createFormResponseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const db = getAdminDb();

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
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const eventData = eventSnap.data() ?? {};
  const actingUser = await resolveUserId(request);
  const isOrganizer =
    actingUser !== null &&
    (await getOwnedEvent(db, input.event_id, actingUser)).ok;
  if (!isOrganizer && eventData.published !== true) {
    return NextResponse.json(
      { error: "This event is not open for registration" },
      { status: 403 },
    );
  }
  const campaignId = (eventData.campaign_id as string) ?? "";
  let organizerUserId = eventData.user_id as string | undefined;
  if (!organizerUserId && campaignId) {
    const camp = await db.collection(COLLECTIONS.campaigns).doc(campaignId).get();
    organizerUserId = camp.data()?.user_id as string | undefined;
  }

  // Idempotency: look up an existing response for this (event_id, attendee_id).
  const existingSnap = await db
    .collection(COLLECTIONS.form_responses)
    .where("event_id", "==", input.event_id)
    .where("attendee_id", "==", input.attendee_id)
    .limit(1)
    .get();

  const responseRef = existingSnap.empty
    ? db.collection(COLLECTIONS.form_responses).doc()
    : existingSnap.docs[0].ref;
  const isUpdate = !existingSnap.empty;

  // Mirror answers into the flat attendees.metadata cache.
  const metadata: Record<string, string> = {};
  for (const a of input.answers) {
    metadata[a.field_id] = formatValue(a.value);
  }

  const batch = db.batch();
  batch.set(
    responseRef,
    {
      event_id: input.event_id,
      campaign_id: campaignId,
      attendee_id: input.attendee_id,
      user_id: organizerUserId ?? null,
      email: input.email.toLowerCase(),
      name: input.name,
      answers: input.answers,
      form_version: input.form_version ?? 1,
      ...(isUpdate
        ? {}
        : { submitted_at: FieldValue.serverTimestamp() }),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  batch.update(attendeeRef, {
    metadata: {
      ...((attendeeSnap.data()?.metadata as Record<string, string>) ?? {}),
      ...metadata,
    },
  });
  await batch.commit();

  const fresh = await responseRef.get();
  return NextResponse.json(
    { form_response: snapshotToObject(fresh) },
    { status: isUpdate ? 200 : 201 },
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
