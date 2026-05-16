import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import {
  campaignStrategySchema,
  formatZodError,
} from "@/lib/validation/strategy";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject, serializeFirestore } from "@/lib/firestore/serialize";

type Params = { params: Promise<{ id: string }> };

const patchBodySchema = z.object({
  strategy: campaignStrategySchema,
  if_updated_at: z.string().optional(),
});

/**
 * PATCH /api/campaigns/[id]/strategy
 * Replaces the campaign's strategy document with optimistic concurrency:
 * if `if_updated_at` is supplied and doesn't match the current value the
 * write is rejected with 409 so the client can reconcile.
 * Auth: campaign owner.
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const raw = await request.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.campaigns).doc(id);

  try {
    const updated = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data()!;
      if (data.user_id !== userId) throw new Error("FORBIDDEN");

      if (parsed.data.if_updated_at) {
        const current = data.updated_at;
        const currentIso =
          current && typeof current.toDate === "function"
            ? current.toDate().toISOString()
            : String(current ?? "");
        if (currentIso !== parsed.data.if_updated_at) {
          throw new Error("CONFLICT");
        }
      }

      const nextStatus =
        data.status === "draft" ? "strategy_ready" : data.status;

      tx.update(ref, {
        strategy_json: parsed.data.strategy,
        status: nextStatus,
        updated_at: FieldValue.serverTimestamp(),
      });
      return { ...data, strategy_json: parsed.data.strategy, status: nextStatus };
    });

    const fresh = await ref.get();
    return NextResponse.json({ campaign: snapshotToObject(fresh) });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (code === "CONFLICT") {
      const fresh = await ref.get();
      return NextResponse.json(
        {
          error:
            "This strategy was edited somewhere else. Reload to see the latest version.",
          campaign: serializeFirestore({ id, ...(fresh.data() ?? {}) }),
        },
        { status: 409 },
      );
    }
    console.error("strategy PATCH failed:", err);
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 },
    );
  }
}
