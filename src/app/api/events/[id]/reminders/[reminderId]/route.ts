import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { getOwnedEvent } from "@/lib/firestore/queries";
import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  coerceReminderChannel,
  deleteReminder,
  updateReminder,
} from "@/lib/firestore/reminders";
import type { ReminderChannel } from "@/types/campaign";

type Params = { params: Promise<{ id: string; reminderId: string }> };

/**
 * Verifies the reminder exists and belongs to the requested event.
 * Returns null when missing/mismatched.
 */
async function ensureBelongsToEvent(
  db: FirebaseFirestore.Firestore,
  reminderId: string,
  eventId: string,
): Promise<boolean> {
  const snap = await db
    .collection(COLLECTIONS.event_reminders)
    .doc(reminderId)
    .get();
  if (!snap.exists) return false;
  return snap.data()?.event_id === eventId;
}

/**
 * PATCH /api/events/[id]/reminders/[reminderId]
 * Partial update of subject/body/enabled/scheduled_for.
 * Auth: event owner.
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id, reminderId } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  if (!(await ensureBelongsToEvent(db, reminderId, id))) {
    return NextResponse.json(
      { error: "Reminder not found" },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const patch: {
    subject?: string;
    body?: string;
    enabled?: boolean;
    scheduled_for?: Date;
    channel?: ReminderChannel;
  } = {};
  if (typeof body.subject === "string") patch.subject = body.subject;
  if (typeof body.body === "string") patch.body = body.body;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.channel !== undefined) {
    patch.channel = coerceReminderChannel(body.channel);
  }
  if (typeof body.scheduled_for === "string") {
    const d = new Date(body.scheduled_for);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "scheduled_for must be a valid ISO datetime" },
        { status: 400 },
      );
    }
    patch.scheduled_for = d;
  }

  const reminder = await updateReminder(db, reminderId, patch);
  if (!reminder) {
    return NextResponse.json(
      { error: "Reminder not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ reminder });
}

/**
 * DELETE /api/events/[id]/reminders/[reminderId]
 * Auth: event owner.
 */
export async function DELETE(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id, reminderId } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  if (!(await ensureBelongsToEvent(db, reminderId, id))) {
    return NextResponse.json(
      { error: "Reminder not found" },
      { status: 404 },
    );
  }

  await deleteReminder(db, reminderId);
  return NextResponse.json({ ok: true });
}
