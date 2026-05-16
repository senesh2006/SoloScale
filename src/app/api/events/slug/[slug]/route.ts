import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { firebaseNotConfigured } from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/events/slug/[slug]
 * Public — returns the published event for the given slug. 404 otherwise.
 */
export async function GET(_request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { slug } = await params;
  const snap = await getAdminDb()
    .collection(COLLECTIONS.events)
    .where("slug", "==", slug)
    .where("published", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event: snapshotToObject(snap.docs[0]) });
}
