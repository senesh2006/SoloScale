import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";

/**
 * GET /api/me
 * Returns the caller's user profile if a `users/{uid}` document exists.
 * If no profile has been created yet (common for the dev-user fallback)
 * it returns just the resolved uid so the UI can render a placeholder
 * without lying about identity.
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const uid = await resolveUserId(request);
  if (!uid) return unauthorized();

  const snap = await getAdminDb().collection(COLLECTIONS.users).doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json({ uid, user: null });
  }
  return NextResponse.json({ uid, user: snapshotToObject(snap) });
}
