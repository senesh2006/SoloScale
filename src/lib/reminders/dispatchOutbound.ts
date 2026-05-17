import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { listDueOutboundReminders } from "@/lib/firestore/reminders";
import { sendBulkEmailViaResend } from "@/lib/notifications/resendEmail";

export type DispatchItemResult = {
  reminder_id: string;
  event_id: string;
  channel: string;
  delivered_count: number;
  ok: boolean;
  error?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type AttendeeRow = {
  email: string;
};

async function loadAttendees(
  db: Firestore,
  eventId: string,
): Promise<AttendeeRow[]> {
  const snap = await db
    .collection(COLLECTIONS.attendees)
    .where("event_id", "==", eventId)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      email: String(data.email ?? "").trim(),
    };
  });
}

async function markSent(
  db: Firestore,
  reminderId: string,
  deliveredCount: number,
) {
  await db.collection(COLLECTIONS.event_reminders).doc(reminderId).update({
    status: "sent",
    sent_at: FieldValue.serverTimestamp(),
    delivered_count: deliveredCount,
    last_error: null,
    updated_at: FieldValue.serverTimestamp(),
  });
}

async function markFailed(
  db: Firestore,
  reminderId: string,
  error: string,
) {
  await db.collection(COLLECTIONS.event_reminders).doc(reminderId).update({
    status: "failed",
    last_error: error.slice(0, 1500),
    updated_at: FieldValue.serverTimestamp(),
  });
}

/**
 * Processes due email reminders: loads attendees for each event, sends via
 * Resend (one message per recipient), then updates reminder docs.
 */
export async function dispatchOutboundReminders(
  db: Firestore,
  opts: { limit?: number } = {},
): Promise<{ processed: DispatchItemResult[] }> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const due = await listDueOutboundReminders(db, limit);
  const processed: DispatchItemResult[] = [];

  for (const row of due) {
    const reminderId = row.id;
    const eventId = row.event_id;
    const channel = row.channel;
    const subject = row.subject ?? "";
    const body = row.body ?? "";

    const attendees = await loadAttendees(db, eventId);
    const emails = attendees
      .map((a) => a.email.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      await markSent(db, reminderId, 0);
      processed.push({
        reminder_id: reminderId,
        event_id: eventId,
        channel,
        delivered_count: 0,
        ok: true,
      });
      continue;
    }

    const send = await sendBulkEmailViaResend({
      to: emails,
      subject,
      text: body,
      html: `<p>${escapeHtml(body).replace(/\n/g, "<br/>")}</p>`,
    });

    if (!send.ok) {
      await markFailed(db, reminderId, send.error);
      processed.push({
        reminder_id: reminderId,
        event_id: eventId,
        channel,
        delivered_count: 0,
        ok: false,
        error: send.error,
      });
      continue;
    }

    await markSent(db, reminderId, emails.length);
    processed.push({
      reminder_id: reminderId,
      event_id: eventId,
      channel,
      delivered_count: emails.length,
      ok: true,
    });
  }

  return { processed };
}
