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
import { getOwnedEvent } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/events/[id]/announcements
 * Lists announcements sent for the event. Auth: event owner.
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const snap = await db
    .collection(COLLECTIONS.announcements)
    .where("event_id", "==", id)
    .limit(200)
    .get();

  const announcements = snap.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((a): a is Record<string, unknown> & { id: string } => Boolean(a))
    .sort((a, b) => {
      const at = String(a.sent_at ?? a.created_at ?? "");
      const bt = String(b.sent_at ?? b.created_at ?? "");
      return bt.localeCompare(at);
    });

  return NextResponse.json({ announcements });
}

/**
 * POST /api/events/[id]/announcements
 * Creates a new announcement for the event and snapshots its recipient count.
 * Auth: event owner.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    subject?: unknown;
    body?: unknown;
    channel?: unknown;
  };

  const subject = String(body.subject ?? "").trim();
  const messageBody = String(body.body ?? "").trim();
  const channel = body.channel === "in_app" ? "in_app" : "email";

  if (subject.length < 2 || subject.length > 140) {
    return NextResponse.json(
      { error: "Subject must be 2–140 characters" },
      { status: 400 },
    );
  }
  if (messageBody.length < 4) {
    return NextResponse.json(
      { error: "Message body is too short" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const recipientsSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", id)
    .get();
  const recipientCount = recipientsSnap.size;

  const ref = db.collection(COLLECTIONS.announcements).doc();
  await ref.set({
    event_id: id,
    user_id: userId,
    subject,
    body: messageBody,
    channel,
    recipient_count: recipientCount,
    sent_at: FieldValue.serverTimestamp(),
    created_at: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  return NextResponse.json(
    { announcement: snapshotToObject(created) },
    { status: 201 },
  );
}
