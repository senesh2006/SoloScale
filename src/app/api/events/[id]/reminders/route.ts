import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { getOwnedEvent } from "@/lib/firestore/queries";
import {
  coerceReminderChannel,
  createCustomReminder,
  isPresetId,
  listEventReminders,
  upsertPresetReminder,
} from "@/lib/firestore/reminders";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/events/[id]/reminders
 * Lists scheduled reminders for an event, plus the event date and headline
 * (the panel uses both to compute the timeline UI).
 * Auth: event owner.
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
  const event = owned.data;

  const reminders = await listEventReminders(db, id);
  const eventDateField = event.event_date as Timestamp | null | undefined;
  const eventDate =
    eventDateField && typeof eventDateField.toDate === "function"
      ? eventDateField.toDate().toISOString()
      : null;
  const eventTitle =
    (event.landing as { headline?: string } | undefined)?.headline ?? "Event";

  return NextResponse.json({
    reminders,
    event_date: eventDate,
    event_title: eventTitle,
  });
}

/**
 * POST /api/events/[id]/reminders
 *
 * Two shapes:
 *   - Preset: `{ preset_id: "7d" | "24h" | "1h", enabled, subject?, body? }`
 *     Idempotent on `(event_id, preset_id)` — toggles the preset on/off and
 *     reschedules relative to the event date.
 *   - Custom: `{ scheduled_for, subject, body, label? }` — creates a one-off
 *     reminder at the given time.
 *
 * Auth: event owner.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }
  const event = owned.data;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  // -------- Preset path --------
  if (body.preset_id && isPresetId(String(body.preset_id))) {
    const eventDateField = event.event_date as Timestamp | null | undefined;
    if (!eventDateField || typeof eventDateField.toDate !== "function") {
      return NextResponse.json(
        { error: "Set an event date before scheduling reminders" },
        { status: 400 },
      );
    }

    const eventTitle =
      (event.landing as { headline?: string } | undefined)?.headline ??
      "Event";

    const reminder = await upsertPresetReminder(db, {
      eventId: id,
      userId,
      presetId: String(body.preset_id) as "7d" | "24h" | "1h",
      eventDate: eventDateField.toDate(),
      eventTitle,
      enabled: Boolean(body.enabled),
      subject: typeof body.subject === "string" ? body.subject : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      channel: coerceReminderChannel(body.channel),
    });

    return NextResponse.json({ reminder }, { status: 200 });
  }

  // -------- Custom path --------
  const scheduledForRaw =
    typeof body.scheduled_for === "string" ? body.scheduled_for : "";
  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const label = typeof body.label === "string" ? body.label : undefined;

  if (!scheduledForRaw || subject.length < 2 || messageBody.length < 4) {
    return NextResponse.json(
      { error: "scheduled_for, subject, and body are required" },
      { status: 400 },
    );
  }
  const scheduledFor = new Date(scheduledForRaw);
  if (Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json(
      { error: "scheduled_for must be a valid ISO datetime" },
      { status: 400 },
    );
  }

  const reminder = await createCustomReminder(db, {
    eventId: id,
    userId,
    scheduledFor,
    subject,
    body: messageBody,
    label,
    channel: coerceReminderChannel(body.channel),
  });

  return NextResponse.json({ reminder }, { status: 201 });
}
