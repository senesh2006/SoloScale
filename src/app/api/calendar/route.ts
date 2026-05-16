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
import type { CalendarEntry } from "@/types/campaign";

/**
 * GET /api/calendar?from=ISO&to=ISO
 * Returns scheduled content items + event dates within the window for the
 * authenticated user (their campaigns + linked events).
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { searchParams } = new URL(request.url);
  const from =
    searchParams.get("from") ??
    new Date(Date.now() - 30 * 86400000).toISOString();
  const to =
    searchParams.get("to") ??
    new Date(Date.now() + 30 * 86400000).toISOString();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);

  const db = getAdminDb();
  const campaignsSnap = await db
    .collection(COLLECTIONS.campaigns)
    .where("user_id", "==", userId)
    .get();

  const entries: CalendarEntry[] = [];
  const eventIds: { eventId: string; campaignId: string; title: string }[] = [];

  for (const doc of campaignsSnap.docs) {
    const data = doc.data();
    const title = (data.title as string) ?? "Untitled";
    const strategy = data.strategy_json as
      | { timeline?: { id: string; type: string; scheduled_at: string; copy: string }[] }
      | null
      | undefined;

    if (strategy?.timeline) {
      for (const item of strategy.timeline) {
        const at = Date.parse(item.scheduled_at);
        if (Number.isNaN(at) || at < fromMs || at > toMs) continue;
        entries.push({
          id: `${doc.id}-${item.id}`,
          campaign_id: doc.id,
          campaign_title: title,
          type: item.type as CalendarEntry["type"],
          scheduled_at: item.scheduled_at,
          title: item.copy?.slice(0, 60) ?? "",
        });
      }
    }

    if (data.event_id) {
      eventIds.push({
        eventId: data.event_id as string,
        campaignId: doc.id,
        title,
      });
    }
  }

  if (eventIds.length > 0) {
    const refs = eventIds.map(({ eventId }) =>
      db.collection(COLLECTIONS.events).doc(eventId),
    );
    const eventDocs = await db.getAll(...refs);
    eventDocs.forEach((eventSnap, idx) => {
      if (!eventSnap.exists) return;
      const ev = eventSnap.data()!;
      const date = ev.event_date as Timestamp | null | undefined;
      if (!date || typeof date.toDate !== "function") return;
      const isoDate = date.toDate().toISOString();
      const at = Date.parse(isoDate);
      if (Number.isNaN(at) || at < fromMs || at > toMs) return;
      entries.push({
        id: `event-${eventSnap.id}`,
        campaign_id: eventIds[idx].campaignId,
        campaign_title: eventIds[idx].title,
        type: "event",
        scheduled_at: isoDate,
        title:
          (ev.landing as { headline?: string } | undefined)?.headline ??
          eventIds[idx].title,
      });
    });
  }

  entries.sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
  return NextResponse.json({ entries });
}
