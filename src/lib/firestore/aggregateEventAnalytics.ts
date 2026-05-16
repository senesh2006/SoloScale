import { COLLECTIONS } from "@/lib/firestore/collections";

export type EventAnalytics = {
  event_id: string;
  attendee_count: number;
  paid_count: number;
  free_count: number;
  revenue_cents: number;
  currency: string | null;
  registrations_by_day: { date: string; count: number }[];
  response_count: number;
  answer_breakdowns: Record<
    string,
    { label?: string; type?: string; counts: Record<string, number> }
  >;
};

/**
 * Aggregates attendee, payment, and form-response metrics for one event.
 * No PII — counts and breakdowns only.
 */
export async function aggregateEventAnalytics(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  currency: string | null = null,
): Promise<EventAnalytics> {
  const [attSnap, paySnap, respSnap] = await Promise.all([
    db.collection(COLLECTIONS.attendees).where("event_id", "==", eventId).get(),
    db
      .collection(COLLECTIONS.payments)
      .where("event_id", "==", eventId)
      .where("status", "==", "succeeded")
      .get(),
    db
      .collection(COLLECTIONS.form_responses)
      .where("event_id", "==", eventId)
      .get(),
  ]);

  const attendees = attSnap.docs.map((d) => d.data());
  const paid_count = attendees.filter((a) => a.paid === true).length;

  let revenue_cents = 0;
  for (const p of paySnap.docs) {
    revenue_cents += (p.data().amount_cents as number | undefined) ?? 0;
  }

  const registrationsByDay = new Map<string, number>();
  for (const a of attendees) {
    const ts = a.created_at as FirebaseFirestore.Timestamp | undefined;
    if (!ts || typeof ts.toDate !== "function") continue;
    const date = ts.toDate().toISOString().slice(0, 10);
    registrationsByDay.set(date, (registrationsByDay.get(date) ?? 0) + 1);
  }
  const registrations_by_day = [...registrationsByDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const answer_breakdowns: EventAnalytics["answer_breakdowns"] = {};
  for (const r of respSnap.docs) {
    const answers = (r.data().answers ?? []) as Array<{
      field_id: string;
      label?: string;
      type?: string;
      value: unknown;
    }>;
    for (const ans of answers) {
      if (
        ans.type !== "select" &&
        ans.type !== "checkbox" &&
        !Array.isArray(ans.value)
      ) {
        continue;
      }
      const key = ans.field_id;
      if (!answer_breakdowns[key]) {
        answer_breakdowns[key] = {
          label: ans.label,
          type: ans.type,
          counts: {},
        };
      }
      const values = Array.isArray(ans.value)
        ? ans.value.map(String)
        : [String(ans.value)];
      for (const v of values) {
        answer_breakdowns[key].counts[v] =
          (answer_breakdowns[key].counts[v] ?? 0) + 1;
      }
    }
  }

  return {
    event_id: eventId,
    attendee_count: attendees.length,
    paid_count,
    free_count: attendees.length - paid_count,
    revenue_cents,
    currency,
    registrations_by_day,
    response_count: respSnap.size,
    answer_breakdowns,
  };
}
