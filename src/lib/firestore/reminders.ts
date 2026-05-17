import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import type {
  EventReminder,
  ReminderChannel,
  ReminderPresetId,
  ReminderStatus,
} from "@/types/campaign";

/** Stored shape inside `event_reminders/{id}`. */
export type EventReminderDocument = {
  event_id: string;
  user_id: string;
  preset_id: ReminderPresetId | null;
  label: string;
  scheduled_for: Timestamp;
  subject: string;
  body: string;
  status: ReminderStatus;
  enabled: boolean;
  channel: ReminderChannel;
  sent_at: Timestamp | null;
  delivered_count?: number;
  last_error?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export function coerceReminderChannel(value: unknown): ReminderChannel {
  if (value === "in_app") return "in_app";
  if (value === "whatsapp") return "email";
  return "email";
}

const PRESET_OFFSETS_MS: Record<Exclude<ReminderPresetId, "custom">, number> = {
  "7d": 7 * 86400000,
  "24h": 86400000,
  "1h": 3600000,
};

const PRESET_LABELS: Record<Exclude<ReminderPresetId, "custom">, string> = {
  "7d": "1 week before",
  "24h": "24 hours before",
  "1h": "1 hour before",
};

const PRESET_DEFAULT_SUBJECT: Record<
  Exclude<ReminderPresetId, "custom">,
  string
> = {
  "7d": "One week until {event}",
  "24h": "Tomorrow: {event}",
  "1h": "Starting in 1 hour — {event}",
};

const PRESET_DEFAULT_BODY: Record<
  Exclude<ReminderPresetId, "custom">,
  string
> = {
  "7d": "Your event is coming up in 7 days. Save the date and review the agenda.",
  "24h": "You're registered — here's everything you need for tomorrow.",
  "1h": "We go live in about an hour. Grab your ticket link and join us.",
};

export function isPresetId(
  value: string,
): value is Exclude<ReminderPresetId, "custom"> {
  return value === "7d" || value === "24h" || value === "1h";
}

/** Lists all reminders for an event, sorted by scheduled time. */
export async function listEventReminders(
  db: Firestore,
  eventId: string,
): Promise<EventReminder[]> {
  const snap = await db
    .collection(COLLECTIONS.event_reminders)
    .where("event_id", "==", eventId)
    .get();

  return snap.docs
    .map(
      (d) =>
        snapshotToObject<Record<string, unknown>>({
          id: d.id,
          data: () => d.data(),
        })!,
    )
    .map(toEventReminder)
    .sort(
      (a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for),
    );
}

/** Due reminders for cron dispatch (email only; legacy `whatsapp` rows send as email). */
export async function listDueOutboundReminders(
  db: Firestore,
  limit: number,
): Promise<(EventReminderDocument & { id: string })[]> {
  const now = Timestamp.now();
  const snap = await db
    .collection(COLLECTIONS.event_reminders)
    .where("status", "==", "scheduled")
    .where("enabled", "==", true)
    .where("scheduled_for", "<=", now)
    .orderBy("scheduled_for", "asc")
    .limit(Math.min(Math.max(limit * 4, limit), 200))
    .get();

  const rows: (EventReminderDocument & { id: string })[] = [];
  for (const d of snap.docs) {
    const raw = d.data() as { channel?: string };
    const c = String(raw.channel ?? "email");
    if (c !== "email" && c !== "whatsapp") continue;
    const data = d.data() as EventReminderDocument;
    rows.push({ ...data, id: d.id, channel: "email" });
    if (rows.length >= limit) break;
  }
  return rows;
}

/**
 * Upserts a preset reminder (`7d`, `24h`, `1h`) for an event. Idempotent on
 * `(event_id, preset_id)` — returns the resulting reminder, or null if the
 * caller asked to disable a preset that doesn't exist yet.
 */
export async function upsertPresetReminder(
  db: Firestore,
  args: {
    eventId: string;
    userId: string;
    presetId: Exclude<ReminderPresetId, "custom">;
    eventDate: Date;
    eventTitle: string;
    enabled: boolean;
    subject?: string;
    body?: string;
    channel?: ReminderChannel;
  },
): Promise<EventReminder | null> {
  const scheduledMs =
    args.eventDate.getTime() - PRESET_OFFSETS_MS[args.presetId];
  const scheduledDate = new Date(scheduledMs);

  const existingSnap = await db
    .collection(COLLECTIONS.event_reminders)
    .where("event_id", "==", args.eventId)
    .where("preset_id", "==", args.presetId)
    .limit(1)
    .get();

  const subject =
    args.subject?.trim() ||
    PRESET_DEFAULT_SUBJECT[args.presetId].replace("{event}", args.eventTitle);
  const body =
    args.body?.trim() || PRESET_DEFAULT_BODY[args.presetId];
  const channel = args.channel ?? "email";

  if (existingSnap.empty) {
    if (!args.enabled) return null;
    const ref = db.collection(COLLECTIONS.event_reminders).doc();
    await ref.set({
      event_id: args.eventId,
      user_id: args.userId,
      preset_id: args.presetId,
      label: PRESET_LABELS[args.presetId],
      scheduled_for: scheduledDate,
      subject,
      body,
      status: "scheduled" satisfies ReminderStatus,
      enabled: true,
      channel,
      sent_at: null,
      delivered_count: 0,
      last_error: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    const fresh = await ref.get();
    return toEventReminder(
      snapshotToObject<Record<string, unknown>>({
        id: fresh.id,
        data: () => fresh.data(),
      })!,
    );
  }

  const docRef = existingSnap.docs[0].ref;
  await docRef.update({
    enabled: args.enabled,
    status: args.enabled ? "scheduled" : "cancelled",
    subject,
    body,
    channel,
    scheduled_for: scheduledDate,
    updated_at: FieldValue.serverTimestamp(),
  });
  const fresh = await docRef.get();
  return toEventReminder(
    snapshotToObject<Record<string, unknown>>({
      id: fresh.id,
      data: () => fresh.data(),
    })!,
  );
}

/** Creates a custom reminder. */
export async function createCustomReminder(
  db: Firestore,
  args: {
    eventId: string;
    userId: string;
    scheduledFor: Date;
    subject: string;
    body: string;
    label?: string;
    channel?: ReminderChannel;
  },
): Promise<EventReminder> {
  const channel = args.channel ?? "email";
  const ref = db.collection(COLLECTIONS.event_reminders).doc();
  await ref.set({
    event_id: args.eventId,
    user_id: args.userId,
    preset_id: null,
    label: args.label?.trim() || "Custom reminder",
    scheduled_for: args.scheduledFor,
    subject: args.subject,
    body: args.body,
    status: "scheduled" satisfies ReminderStatus,
    enabled: true,
    channel,
    sent_at: null,
    delivered_count: 0,
    last_error: null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  const fresh = await ref.get();
  return toEventReminder(
    snapshotToObject<Record<string, unknown>>({
      id: fresh.id,
      data: () => fresh.data(),
    })!,
  );
}

export async function updateReminder(
  db: Firestore,
  reminderId: string,
  patch: {
    subject?: string;
    body?: string;
    enabled?: boolean;
    scheduled_for?: Date;
    channel?: ReminderChannel;
  },
): Promise<EventReminder | null> {
  const ref = db.collection(COLLECTIONS.event_reminders).doc(reminderId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const update: Record<string, unknown> = {
    updated_at: FieldValue.serverTimestamp(),
  };
  if (patch.subject !== undefined) update.subject = patch.subject;
  if (patch.body !== undefined) update.body = patch.body;
  if (patch.enabled !== undefined) {
    update.enabled = patch.enabled;
    update.status = patch.enabled ? "scheduled" : "cancelled";
  }
  if (patch.scheduled_for !== undefined) {
    update.scheduled_for = patch.scheduled_for;
  }
  if (patch.channel !== undefined) {
    update.channel = patch.channel;
  }

  await ref.update(update);
  const fresh = await ref.get();
  return toEventReminder(
    snapshotToObject<Record<string, unknown>>({
      id: fresh.id,
      data: () => fresh.data(),
    })!,
  );
}

export async function deleteReminder(
  db: Firestore,
  reminderId: string,
): Promise<boolean> {
  const ref = db.collection(COLLECTIONS.event_reminders).doc(reminderId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

/** Coerce a serialized Firestore reminder into the API EventReminder shape. */
function toEventReminder(
  data: Record<string, unknown> & { id: string },
): EventReminder {
  return {
    id: data.id,
    event_id: String(data.event_id),
    preset_id: (data.preset_id as EventReminder["preset_id"]) ?? null,
    label: String(data.label ?? "Reminder"),
    scheduled_for: String(data.scheduled_for),
    subject: String(data.subject ?? ""),
    body: String(data.body ?? ""),
    status: (data.status as EventReminder["status"]) ?? "scheduled",
    enabled: Boolean(data.enabled),
    channel: coerceReminderChannel(data.channel),
    sent_at:
      data.sent_at && data.sent_at !== null ? String(data.sent_at) : null,
    delivered_count:
      typeof data.delivered_count === "number" ? data.delivered_count : undefined,
    last_error:
      data.last_error === undefined || data.last_error === null
        ? null
        : String(data.last_error),
  };
}
