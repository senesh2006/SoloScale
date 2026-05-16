import { NextResponse } from "next/server";
import { getEvent, updateEvent, useMocks } from "@/lib/mock-store";
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
 * Returns a single event. Mock mode reads in-memory; otherwise enforces ownership.
 * Pass `?public=1` to skip the ownership check (used for the public landing page).
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const publicView = url.searchParams.get("public") === "1";

  if (useMocks()) {
    const event = getEvent(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ event });
  }

  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const db = getAdminDb();

  if (publicView) {
    const snap = await db.collection(COLLECTIONS.events).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (snap.data()?.published === false) {
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
  return NextResponse.json({ event: { id, ...owned.data } });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

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

  const event = updateEvent(id, {
    landing: body.landing,
    form_fields: body.form_fields,
    price: body.price,
    media: body.media,
    sponsors: body.sponsors,
    sponsors_display: body.sponsors_display,
    event_date: body.event_date,
    location: body.location,
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
