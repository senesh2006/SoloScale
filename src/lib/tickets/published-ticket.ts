import type {
  DocumentSnapshot,
  Firestore,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore/collections";

export type PublishedTicketDocs =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      attendee: QueryDocumentSnapshot;
      event: DocumentSnapshot;
    };

/**
 * Attendee row + event doc for a ticket code, only when the event is published.
 * Used by public ticket JSON and QR image routes.
 */
export async function getPublishedTicketForCode(
  db: Firestore,
  code: string,
): Promise<PublishedTicketDocs> {
  const attSnap = await db
    .collection(COLLECTIONS.attendees)
    .where("ticket_code", "==", code)
    .limit(1)
    .get();

  if (attSnap.empty) {
    return { ok: false, status: 404, error: "Ticket not found" };
  }

  const attendeeDoc = attSnap.docs[0];
  const eventId = attendeeDoc.data().event_id as string | undefined;
  if (!eventId) {
    return { ok: false, status: 500, error: "Ticket missing event_id" };
  }

  const eventSnap = await db.collection(COLLECTIONS.events).doc(eventId).get();
  if (!eventSnap.exists) {
    return { ok: false, status: 404, error: "Event not found" };
  }
  if (eventSnap.data()?.published !== true) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  return { ok: true, attendee: attendeeDoc, event: eventSnap };
}

/** Absolute URL to the public ticket page for QR codes and share links. */
export function absolutePublicTicketPageUrl(
  request: Request,
  ticketCode: string,
): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    url.host;
  return `${proto}://${host}/t/${encodeURIComponent(ticketCode)}`;
}
