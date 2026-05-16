import type {
  CollectionReference,
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { snapshotToObject } from "@/lib/firestore/serialize";

/** Parse and clamp a `?limit=` query parameter. */
export function parseLimit(
  url: URL,
  fallback = 100,
  max = 500,
): number {
  const raw = url.searchParams.get("limit");
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/** Run a query with optional `?cursor=<docId>` pagination, returning serialized rows. */
export async function listDocs<T = Record<string, unknown>>(
  collection: CollectionReference | Query,
  limit: number,
  cursorDocId?: string | null,
  rootCollection?: CollectionReference,
): Promise<{ items: (T & { id: string })[]; next_cursor: string | null }> {
  let query = collection;
  if (cursorDocId && rootCollection) {
    const cursorSnap = await rootCollection.doc(cursorDocId).get();
    if (cursorSnap.exists) {
      query = (query as Query).startAfter(cursorSnap);
    }
  }
  const snap = await (query as Query).limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  const next_cursor =
    snap.docs.length > limit ? snap.docs[limit - 1].id : null;
  const items = docs.map((d: QueryDocumentSnapshot) => {
    const data = d.data();
    return { id: d.id, ...(snapshotToObject({ id: d.id, data: () => data }) ?? {}) } as T & {
      id: string;
    };
  });
  return { items, next_cursor };
}

/**
 * Fetches a campaign and confirms ownership.
 * Returns either `{ ok: true, data }` or `{ ok: false, status, error }`.
 */
export async function getOwnedCampaign(
  db: Firestore,
  campaignId: string,
  userId: string,
): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const snap = await db.collection("campaigns").doc(campaignId).get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Campaign not found" };
  }
  const data = snap.data() ?? {};
  if (data.user_id !== userId) {
    return { ok: false, status: 403, error: "You do not own this campaign" };
  }
  return { ok: true, data };
}

/** Fetches an event and confirms its parent campaign is owned by `userId`. */
export async function getOwnedEvent(
  db: Firestore,
  eventId: string,
  userId: string,
): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    return { ok: false, status: 404, error: "Event not found" };
  }
  const event = eventSnap.data() ?? {};
  const campaignId = event.campaign_id as string | undefined;
  if (!campaignId) {
    return { ok: false, status: 500, error: "Event missing campaign_id" };
  }
  const campaignSnap = await db.collection("campaigns").doc(campaignId).get();
  if (!campaignSnap.exists || campaignSnap.data()?.user_id !== userId) {
    return { ok: false, status: 403, error: "You do not own this event" };
  }
  return { ok: true, data: event };
}
