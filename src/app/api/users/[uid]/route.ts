import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  getAuthenticatedUid,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";

type Params = { params: Promise<{ uid: string }> };

/**
 * GET /api/users/[uid]
 * Returns the user profile. Auth required — only the user themselves can read.
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { uid } = await params;
  const callerUid = await getAuthenticatedUid(request);
  if (!callerUid) return unauthorized();
  if (callerUid !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await getAdminDb().collection(COLLECTIONS.users).doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user: snapshotToObject(snap) });
}
