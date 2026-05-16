import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { createAnnouncementSchema } from "@/lib/validation/api-inputs";

/**
 * POST /api/announcements
 * Creates a broadcast announcement for an event. Top-level alternative to
 * `POST /api/events/[id]/announcements` — useful when the client already has
 * the event id in the body.
 * Auth: required (the campaign owner).
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const userId = await resolveUserId(request, json);
  if (!userId) return unauthorized();

  const parsed = createAnnouncementSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const db = getAdminDb();
  const eventSnap = await db
    .collection(COLLECTIONS.events)
    .doc(input.event_id)
    .get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const campaignId = eventSnap.data()?.campaign_id as string | undefined;
  if (campaignId) {
    const campaignSnap = await db
      .collection(COLLECTIONS.campaigns)
      .doc(campaignId)
      .get();
    if (
      !campaignSnap.exists ||
      campaignSnap.data()?.user_id !== userId
    ) {
      return NextResponse.json(
        { error: "You do not own this event" },
        { status: 403 },
      );
    }
  }

  const recipientCount = (eventSnap.data()?.attendee_count as number) ?? 0;
  const ref = db.collection(COLLECTIONS.announcements).doc();
  await ref.set({
    event_id: input.event_id,
    subject: input.subject,
    body: input.body,
    channel: input.channel,
    recipient_count: recipientCount,
    sent_at: FieldValue.serverTimestamp(),
    scheduled_for: input.scheduled_for
      ? Timestamp.fromDate(new Date(input.scheduled_for))
      : null,
    created_by: userId,
  });

  const created = await ref.get();
  return NextResponse.json(
    { announcement: snapshotToObject(created) },
    { status: 201 },
  );
}
