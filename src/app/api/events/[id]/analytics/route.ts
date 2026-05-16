import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { aggregateEventAnalytics } from "@/lib/firestore/aggregateEventAnalytics";
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

  const analytics = await aggregateEventAnalytics(db, id, currency);

  return NextResponse.json(analytics);
}
