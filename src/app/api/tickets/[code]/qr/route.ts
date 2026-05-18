import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import {
  absolutePublicTicketPageUrl,
  getPublishedTicketForCode,
} from "@/lib/tickets/published-ticket";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/tickets/[code]/qr
 * Same-origin PNG for the ticket QR (so html2canvas can export the card).
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { code } = await params;
  const db = getAdminDb();
  const resolved = await getPublishedTicketForCode(db, code);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const ticketUrl = absolutePublicTicketPageUrl(request, code);
  const upstream = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=8&data=${encodeURIComponent(
    ticketUrl,
  )}`;

  const imgRes = await fetch(upstream);
  if (!imgRes.ok) {
    return NextResponse.json(
      { error: "Could not generate QR code" },
      { status: 502 },
    );
  }

  const buf = await imgRes.arrayBuffer();
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  };
  if (new URL(request.url).searchParams.get("attachment") === "1") {
    headers["Content-Disposition"] =
      `attachment; filename="ticket-${code}-qr.png"`;
  }
  return new NextResponse(buf, { headers });
}
