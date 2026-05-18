import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { getPublishedTicketForCode } from "@/lib/tickets/published-ticket";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/tickets/[code]
 * Public ticket lookup — returns the attendee + their event by ticket code.
 */
export async function GET(_request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { code } = await params;
  const db = getAdminDb();
  const resolved = await getPublishedTicketForCode(db, code);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json({
    attendee: snapshotToObject(resolved.attendee),
    event: snapshotToObject(resolved.event),
  });
}
