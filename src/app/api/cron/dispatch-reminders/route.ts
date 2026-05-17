import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import { dispatchOutboundReminders } from "@/lib/reminders/dispatchOutbound";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

/**
 * GET/POST /api/cron/dispatch-reminders
 *
 * Sends due event reminders (email via Resend) to attendees
 * registered on each event. Secured with `CRON_SECRET` (Authorization: Bearer …
 * or `?secret=`).
 */
export async function GET(request: Request) {
  return runDispatch(request);
}

export async function POST(request: Request) {
  return runDispatch(request);
}

async function runDispatch(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw
    ? Number.parseInt(limitRaw, 10)
    : undefined;

  const db = getAdminDb();
  const { processed } = await dispatchOutboundReminders(db, { limit });

  return NextResponse.json({
    ok: true,
    count: processed.length,
    processed,
  });
}
