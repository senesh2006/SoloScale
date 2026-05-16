import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { getOwnedEvent } from "@/lib/firestore/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/events/[id]/analytics
 * Returns aggregated metrics for an event — useful for charts and the AI
 * chatbot's quick "how's the event doing?" answers.
 *
 * Returns:
 *   {
 *     attendee_count, paid_count, free_count,
 *     revenue_cents, currency,
 *     registrations_by_day: [{ date, count }],
 *     answer_breakdowns: { [field_id]: { [answer]: count } } // for select/checkbox
 *   }
 *
 * Auth: required (event owner).
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

  const event = owned.data as Record<string, unknown>;
  const currency =
    (event.price as { currency?: string } | null)?.currency ?? null;

  const [attSnap, paySnap, respSnap] = await Promise.all([
    db.collection(COLLECTIONS.attendees).where("event_id", "==", id).get(),
    db
      .collection(COLLECTIONS.payments)
      .where("event_id", "==", id)
      .where("status", "==", "succeeded")
      .get(),
    db
      .collection(COLLECTIONS.form_responses)
      .where("event_id", "==", id)
      .get(),
  ]);

  const attendees = attSnap.docs.map((d) => d.data());
  const paid_count = attendees.filter((a) => a.paid === true).length;

  let revenue_cents = 0;
  for (const p of paySnap.docs) {
    revenue_cents += (p.data().amount_cents as number | undefined) ?? 0;
  }

  // Registrations by day (UTC date).
  const registrationsByDay = new Map<string, number>();
  for (const a of attendees) {
    const ts = a.created_at as
      | FirebaseFirestore.Timestamp
      | undefined;
    if (!ts || typeof ts.toDate !== "function") continue;
    const date = ts.toDate().toISOString().slice(0, 10);
    registrationsByDay.set(date, (registrationsByDay.get(date) ?? 0) + 1);
  }
  const registrations_by_day = [...registrationsByDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Answer breakdowns for select/checkbox/radio fields.
  const answer_breakdowns: Record<
    string,
    { label?: string; type?: string; counts: Record<string, number> }
  > = {};
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

  return NextResponse.json({
    event_id: id,
    attendee_count: attendees.length,
    paid_count,
    free_count: attendees.length - paid_count,
    revenue_cents,
    currency,
    registrations_by_day,
    response_count: respSnap.size,
    answer_breakdowns,
  });
}
