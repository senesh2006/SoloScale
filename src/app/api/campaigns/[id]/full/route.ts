import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject, serializeFirestore } from "@/lib/firestore/serialize";
import { getOwnedCampaign } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id]/full
 * Returns a denormalized blob of everything tied to a campaign — useful for
 * powering an AI chatbot or generating analytics:
 *
 *   { campaign, event, attendees, form_responses, assets, announcements, payments }
 *
 * Auth: required (campaign owner only).
 *
 * Query params:
 *   ?attendees_limit=200    (default 500, max 1000)
 *   ?include=attendees,form_responses,assets,announcements,payments
 *     (defaults to all)
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const url = new URL(request.url);
  const include = parseInclude(url);
  const attendeesLimit = clamp(
    Number.parseInt(url.searchParams.get("attendees_limit") ?? "500", 10) || 500,
    1,
    1000,
  );

  const campaign = serializeFirestore({ id, ...owned.data });
  const eventId = (owned.data.event_id as string | null) ?? null;

  let event: Record<string, unknown> | null = null;
  let attendees: unknown[] = [];
  let formResponses: unknown[] = [];
  let assets: unknown[] = [];
  let announcements: unknown[] = [];
  let payments: unknown[] = [];

  if (eventId) {
    const eventSnap = await db.collection(COLLECTIONS.events).doc(eventId).get();
    if (eventSnap.exists) {
      event = snapshotToObject(eventSnap);
    }
  }

  const tasks: Promise<unknown>[] = [];

  if (eventId && include.attendees) {
    tasks.push(
      db
        .collection(COLLECTIONS.attendees)
        .where("event_id", "==", eventId)
        .orderBy("created_at", "desc")
        .limit(attendeesLimit)
        .get()
        .then((s) => {
          attendees = s.docs.map((d) =>
            snapshotToObject({ id: d.id, data: () => d.data() }),
          );
        }),
    );
  }

  if (eventId && include.form_responses) {
    tasks.push(
      db
        .collection(COLLECTIONS.form_responses)
        .where("event_id", "==", eventId)
        .limit(attendeesLimit)
        .get()
        .then((s) => {
          formResponses = s.docs.map((d) =>
            snapshotToObject({ id: d.id, data: () => d.data() }),
          );
        }),
    );
  }

  if (include.assets) {
    tasks.push(
      db
        .collection(COLLECTIONS.assets)
        .where("campaign_id", "==", id)
        .orderBy("created_at", "desc")
        .get()
        .then((s) => {
          assets = s.docs.map((d) =>
            snapshotToObject({ id: d.id, data: () => d.data() }),
          );
        }),
    );
  }

  if (eventId && include.announcements) {
    tasks.push(
      db
        .collection(COLLECTIONS.announcements)
        .where("event_id", "==", eventId)
        .orderBy("sent_at", "desc")
        .get()
        .then((s) => {
          announcements = s.docs.map((d) =>
            snapshotToObject({ id: d.id, data: () => d.data() }),
          );
        }),
    );
  }

  if (eventId && include.payments) {
    tasks.push(
      db
        .collection(COLLECTIONS.payments)
        .where("event_id", "==", eventId)
        .orderBy("created_at", "desc")
        .limit(attendeesLimit)
        .get()
        .then((s) => {
          payments = s.docs.map((d) =>
            snapshotToObject({ id: d.id, data: () => d.data() }),
          );
        }),
    );
  }

  await Promise.all(tasks);

  return NextResponse.json({
    campaign,
    event,
    attendees,
    form_responses: formResponses,
    assets,
    announcements,
    payments,
    counts: {
      attendees: attendees.length,
      form_responses: formResponses.length,
      assets: assets.length,
      announcements: announcements.length,
      payments: payments.length,
    },
  });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

function parseInclude(url: URL) {
  const raw = url.searchParams.get("include");
  if (!raw) {
    return {
      attendees: true,
      form_responses: true,
      assets: true,
      announcements: true,
      payments: true,
    };
  }
  const set = new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  );
  return {
    attendees: set.has("attendees"),
    form_responses: set.has("form_responses"),
    assets: set.has("assets"),
    announcements: set.has("announcements"),
    payments: set.has("payments"),
  };
}
