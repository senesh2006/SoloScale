import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  EventMedia,
  EventPrice,
  FormField,
  Sponsor,
  SponsorDisplay,
} from "@/types/campaign";
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

type PatchBody = {
  landing?: { headline: string; subhead: string; body_md: string };
  form_fields?: FormField[];
  price?: EventPrice | null;
  media?: EventMedia;
  sponsors?: Sponsor[];
  sponsors_display?: SponsorDisplay;
  event_date?: string | null;
  location?: string | null;
};

/**
 * GET /api/events/[id]
 * Returns a single event. Authenticated requests must own the event;
 * `?public=1` returns a published event without authentication (used by the
 * landing page after slug → id resolution).
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const url = new URL(request.url);
  const publicView = url.searchParams.get("public") === "1";

  const db = getAdminDb();

  if (publicView) {
    const snap = await db.collection(COLLECTIONS.events).doc(id).get();
    if (!snap.exists || snap.data()?.published === false) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ event: snapshotToObject(snap) });
  }

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }
  return NextResponse.json({
    event: { id, ...snapshotToObjectData(owned.data) },
  });
}

/**
 * PATCH /api/events/[id]
 *
 * Updates editable fields on an event. Auth: campaign owner.
 *
 * Refuses to update a published event with HTTP 409 — landing pages,
 * registrations, attendees, and form responses all snapshot the live form,
 * so silently mutating them after publish would corrupt downstream data.
 * Unpublish first via `POST /api/events/[id]/publish { published: false }`.
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

  if (owned.data.published === true) {
    return NextResponse.json(
      {
        error:
          "This event is published. Unpublish it before editing — registrations and form responses are tied to the live version.",
        code: "EVENT_PUBLISHED",
      },
      { status: 409 },
    );
  }

  const needsOwnerBackfill = !owned.data.user_id;

  const body = (await request.json().catch(() => ({}))) as PatchBody;

  if (
    body.sponsors_display !== undefined &&
    body.sponsors_display !== "grid" &&
    body.sponsors_display !== "carousel"
  ) {
    return NextResponse.json(
      { error: "sponsors_display must be 'grid' or 'carousel'" },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    updated_at: FieldValue.serverTimestamp(),
  };
  if (body.landing !== undefined) update.landing = body.landing;
  if (body.form_fields !== undefined) update.form_fields = body.form_fields;
  if (body.price !== undefined) update.price = body.price;
  if (body.media !== undefined) update.media = body.media;
  if (body.sponsors !== undefined) update.sponsors = body.sponsors;
  if (body.sponsors_display !== undefined) {
    update.sponsors_display = body.sponsors_display;
  }
  if (body.event_date !== undefined) {
    update.event_date = body.event_date
      ? Timestamp.fromDate(new Date(body.event_date))
      : null;
  }
  if (body.location !== undefined) update.location = body.location;
  if (needsOwnerBackfill) {
    update.user_id = userId;
  }

  await db.collection(COLLECTIONS.events).doc(id).update(update);
  const fresh = await db.collection(COLLECTIONS.events).doc(id).get();
  return NextResponse.json({ event: snapshotToObject(fresh) });
}

/**
 * Helper — strip Firestore-only fields from the in-memory data for serialization.
 */
function snapshotToObjectData(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof (v as { toDate?: () => Date }).toDate === "function") {
      out[k] = (v as { toDate: () => Date }).toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}
