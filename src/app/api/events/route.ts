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
import { createEventSchema } from "@/lib/validation/api-inputs";

/**
 * POST /api/events
 * Creates an event linked to a campaign owned by the authenticated user.
 * The campaign's `event_id` is updated transactionally.
 * Auth: required.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const userId = await resolveUserId(request, json);
  if (!userId) return unauthorized();

  const parsed = createEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const db = getAdminDb();

  const slugDup = await db
    .collection(COLLECTIONS.events)
    .where("slug", "==", input.slug)
    .limit(1)
    .get();
  if (!slugDup.empty) {
    return NextResponse.json(
      { error: `slug "${input.slug}" is already taken` },
      { status: 409 },
    );
  }

  const campaignRef = db.collection(COLLECTIONS.campaigns).doc(input.campaign_id);
  const eventRef = db.collection(COLLECTIONS.events).doc();

  try {
    await db.runTransaction(async (tx) => {
      const campaignSnap = await tx.get(campaignRef);
      if (!campaignSnap.exists) throw new Error("CAMPAIGN_NOT_FOUND");
      if (campaignSnap.data()?.user_id !== userId) {
        throw new Error("FORBIDDEN");
      }

      tx.set(eventRef, {
        campaign_id: input.campaign_id,
        user_id: userId,
        slug: input.slug,
        published: input.published ?? false,
        landing: input.landing,
        event_date: input.event_date
          ? Timestamp.fromDate(new Date(input.event_date))
          : null,
        location: input.location ?? null,
        form_fields: input.form_fields,
        media: input.media ?? {},
        sponsors: input.sponsors ?? [],
        sponsors_display: input.sponsors_display ?? "grid",
        attendee_count: 0,
        price: input.price ?? null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      tx.update(campaignRef, {
        event_id: eventRef.id,
        updated_at: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }
    if (code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You do not own this campaign" },
        { status: 403 },
      );
    }
    console.error("Failed to create event:", err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }

  const created = await eventRef.get();
  return NextResponse.json(
    { event: snapshotToObject(created) },
    { status: 201 },
  );
}
