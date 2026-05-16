import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Verifies a Firebase ID token from the `Authorization: Bearer ...` header.
 * Returns the uid, or null if the header is missing/invalid.
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

/**
 * Resolves the acting user id for a request:
 *  1. Firebase ID token (preferred)
 *  2. `x-user-id` header (dev convenience)
 *  3. `user_id` field on the JSON body, if provided
 */
export async function resolveUserId(
  request: Request,
  body?: { user_id?: unknown },
): Promise<string | null> {
  const uid = await getAuthenticatedUid(request);
  if (uid) return uid;

  const headerUid = request.headers.get("x-user-id");
  if (headerUid && headerUid.trim()) return headerUid.trim();

  if (body && typeof body.user_id === "string" && body.user_id.trim()) {
    return body.user_id.trim();
  }
  return null;
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
