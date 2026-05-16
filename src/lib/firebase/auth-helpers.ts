import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Verifies a Firebase ID token from `Authorization: Bearer ...`. Returns the
 * uid, or `null` if the header is missing/invalid/expired.
 */
export async function getAuthenticatedUid(
  request: Request,
): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** True when the dev-user fallback is allowed in this environment. */
function isDevFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  // Explicit opt-in only — `DEV_USER_ID=...` alone is no longer enough,
  // you also need `ALLOW_DEV_AUTH_FALLBACK=true`. Stops accidental leaks.
  return process.env.ALLOW_DEV_AUTH_FALLBACK === "true";
}

/**
 * Resolves the acting user id for an authenticated API request.
 *
 * Priority:
 *   1. Verified Firebase ID token (`Authorization: Bearer ...`).
 *   2. `DEV_USER_ID` env var — ONLY when not in production AND
 *      `ALLOW_DEV_AUTH_FALLBACK=true` is set. Designed for local dev
 *      before Firebase Auth is wired in clients other than the web app.
 *
 * The previous `x-user-id` header and `body.user_id` paths were spoofable
 * (any client could pretend to be any user) and are intentionally gone.
 *
 * @param _body Reserved — kept for call-site compatibility, no longer read.
 */
export async function resolveUserId(
  request: Request,
  _body?: { user_id?: unknown },
): Promise<string | null> {
  void _body;
  const uid = await getAuthenticatedUid(request);
  if (uid) return uid;

  if (isDevFallbackAllowed()) {
    const devUid = process.env.DEV_USER_ID;
    if (devUid && devUid.trim()) {
      // One log per process is enough — too noisy otherwise.
      logDevFallbackOnce();
      return devUid.trim();
    }
  }

  return null;
}

let warned = false;
function logDevFallbackOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    "[auth] Using DEV_USER_ID fallback. Disable by removing " +
      "ALLOW_DEV_AUTH_FALLBACK=true from .env.local or by deploying " +
      "with NODE_ENV=production.",
  );
}

/** Standardized 401 response. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 },
  );
}

/** Standardized 501 when Firebase isn't configured server-side. */
export function firebaseNotConfigured(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH and the NEXT_PUBLIC_FIREBASE_* vars in .env.local.",
    },
    { status: 501 },
  );
}
