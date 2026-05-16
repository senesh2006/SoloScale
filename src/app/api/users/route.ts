import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { createUserSchema } from "@/lib/validation/api-inputs";

/**
 * POST /api/users
 * Upserts the authenticated user's profile document at `users/{uid}`.
 * Auth: required (Firebase ID token in `Authorization: Bearer ...`).
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const userId = await resolveUserId(request, json);
  if (!userId) return unauthorized();

  const parsed = createUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.users).doc(userId);
  const existing = await ref.get();

  await ref.set(
    {
      email: parsed.data.email,
      name: parsed.data.name,
      avatar_url: parsed.data.avatar_url ?? null,
      plan_id: parsed.data.plan_id,
      subscription_id: existing.exists
        ? (existing.data()?.subscription_id ?? null)
        : null,
      default_payment_method_id: existing.exists
        ? (existing.data()?.default_payment_method_id ?? null)
        : null,
      stripe_customer_id: existing.exists
        ? (existing.data()?.stripe_customer_id ?? null)
        : null,
      created_at: existing.exists
        ? (existing.data()?.created_at ?? FieldValue.serverTimestamp())
        : FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const fresh = await ref.get();
  return NextResponse.json(
    { user: snapshotToObject(fresh) },
    { status: existing.exists ? 200 : 201 },
  );
}
