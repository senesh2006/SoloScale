import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { generateCampaignStrategy } from "@/services/ai/gemini";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { createCampaignSchema } from "@/lib/validation/api-inputs";
import { createEventFromStrategy } from "@/lib/firestore/helpers";
import { parseLimit } from "@/lib/firestore/queries";
import type { CampaignStrategy } from "@/types/campaign";

/**
 * GET /api/campaigns
 * Lists campaigns for the authenticated user. Supports `?limit=`.
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  const limit = parseLimit(url, 100, 500);

  const db = getAdminDb();
  // Sorted in memory to avoid requiring a (user_id, created_at) composite
  // index; deploy `firebase/firestore.indexes.json` and switch back to
  // server-side ordering if the list grows large.
  const snap = await db
    .collection(COLLECTIONS.campaigns)
    .where("user_id", "==", userId)
    .limit(limit)
    .get();

  const campaigns = snap.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((c): c is Record<string, unknown> & { id: string } => Boolean(c))
    .sort((a, b) => {
      const at = String(a.created_at ?? "");
      const bt = String(b.created_at ?? "");
      return bt.localeCompare(at);
    });

  return NextResponse.json({ campaigns });
}

/**
 * POST /api/campaigns
 * Creates a campaign owned by the authenticated user. If `GEMINI_API_KEY` is
 * set the route also generates the strategy synchronously and (when
 * `mode = "all"`) creates the linked event in one go.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const userId = await resolveUserId(request, json);
  if (!userId) return unauthorized();

  const parsed = createCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const db = getAdminDb();
  const campaignRef = db.collection(COLLECTIONS.campaigns).doc();

  await campaignRef.set({
    user_id: userId,
    title: input.title,
    goal_prompt: input.goal_prompt,
    mode: input.mode,
    status: "draft",
    strategy_json: null,
    event_id: null,
    event_date: input.event_date
      ? Timestamp.fromDate(new Date(input.event_date))
      : null,
    audience: input.audience ?? null,
    flyer_input: input.flyer_input ?? null,
    voice_input: input.voice_input ?? null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  // Best-effort: synchronous strategy generation when an API key is configured.
  // Failure here doesn't fail the request — the campaign is still created.
  if (process.env.GEMINI_API_KEY && input.mode !== "flyer" && input.mode !== "voice") {
    try {
      const strategy = (await generateCampaignStrategy({
        title: input.title,
        goal_prompt: input.goal_prompt,
      })) as CampaignStrategy;

      await campaignRef.update({
        strategy_json: strategy,
        status: "strategy_ready",
        updated_at: FieldValue.serverTimestamp(),
      });

      if (input.mode === "all") {
        await createEventFromStrategy(db, {
          campaignId: campaignRef.id,
          title: input.title,
          strategy,
        });
      }
    } catch (err) {
      console.error("Gemini failed during create — campaign saved as draft:", err);
    }
  }

  const created = await campaignRef.get();
  return NextResponse.json(
    { campaign: snapshotToObject(created) },
    { status: 201 },
  );
}
