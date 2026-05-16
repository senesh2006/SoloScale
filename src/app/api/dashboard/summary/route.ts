import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";

/**
 * GET /api/dashboard/summary
 *
 * Returns the headline numbers shown on the dashboard's stat cards. Computed
 * from the caller's own campaigns + linked events — no precomputed counters.
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const campaignsSnap = await db
    .collection(COLLECTIONS.campaigns)
    .where("user_id", "==", userId)
    .get();

  const total_campaigns = campaignsSnap.size;
  let active_campaigns = 0;
  let live_campaigns = 0;
  const eventIds: string[] = [];

  for (const doc of campaignsSnap.docs) {
    const data = doc.data();
    const status = data.status as string | undefined;
    if (status && status !== "draft") active_campaigns += 1;
    if (status === "published") live_campaigns += 1;
    if (data.event_id) eventIds.push(data.event_id as string);
  }

  let total_attendees = 0;
  if (eventIds.length > 0) {
    const refs = eventIds.map((id) =>
      db.collection(COLLECTIONS.events).doc(id),
    );
    const eventDocs = await db.getAll(...refs);
    for (const snap of eventDocs) {
      if (!snap.exists) continue;
      const c = snap.data()?.attendee_count;
      if (typeof c === "number") total_attendees += c;
    }
  }

  // Scheduled-this-week count comes from each campaign's strategy timeline.
  const now = Date.now();
  const weekAhead = now + 7 * 86400000;
  let scheduled_this_week = 0;
  for (const doc of campaignsSnap.docs) {
    const strategy = doc.data().strategy_json as
      | { timeline?: { scheduled_at?: string }[] }
      | null
      | undefined;
    if (!strategy?.timeline) continue;
    for (const item of strategy.timeline) {
      if (!item.scheduled_at) continue;
      const t = Date.parse(item.scheduled_at);
      if (Number.isNaN(t)) continue;
      if (t >= now && t <= weekAhead) scheduled_this_week += 1;
    }
  }

  // Add events whose date falls within the next 7 days too.
  if (eventIds.length > 0) {
    const refs = eventIds.map((id) =>
      db.collection(COLLECTIONS.events).doc(id),
    );
    const eventDocs = await db.getAll(...refs);
    for (const snap of eventDocs) {
      const ed = snap.data()?.event_date as Timestamp | null | undefined;
      if (!ed || typeof ed.toDate !== "function") continue;
      const t = ed.toDate().getTime();
      if (t >= now && t <= weekAhead) scheduled_this_week += 1;
    }
  }

  return NextResponse.json({
    total_campaigns,
    active_campaigns,
    live_campaigns,
    total_attendees,
    scheduled_this_week,
  });
}
