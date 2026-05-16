import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  createCampaign,
  listCampaigns,
  useMocks,
  updateCampaignStrategy,
  type CreateCampaignMode,
} from "@/lib/mock-store";
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
import { parseLimit } from "@/lib/firestore/queries";

/**
 * GET /api/campaigns
 * Lists campaigns for the authenticated user (newest first). Supports `?limit=`.
 * Mock mode returns the in-memory list.
 */
export async function GET(request: Request) {
  if (useMocks()) {
    return NextResponse.json({ campaigns: listCampaigns() });
  }

  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  const limit = parseLimit(url, 100, 500);

  const db = getAdminDb();
  // No `orderBy` here so we don't require a composite index on
  // (user_id, created_at). For dashboard-scale lists we sort in memory.
  // Add the index and switch back to Firestore-side ordering once it's deployed.
  const snap = await db
    .collection(COLLECTIONS.campaigns)
    .where("user_id", "==", userId)
    .limit(limit)
    .get();

  const campaigns = snap.docs
    .map((d) => snapshotToObject<Record<string, unknown>>({
      id: d.id,
      data: () => d.data(),
    }))
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
 * Creates a new campaign. In mock mode (`NEXT_PUBLIC_USE_MOCKS=true`) writes
 * to the in-memory store; otherwise writes to Firestore (auth required).
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));

  if (useMocks()) {
    const title = (json.title as string)?.trim() || "New Campaign";
    const goal_prompt = (json.goal_prompt as string)?.trim();
    const rawMode = json.mode as string | undefined;
    const mode: CreateCampaignMode = rawMode === "strategy" ? "strategy" : "all";

    if (!goal_prompt) {
      return NextResponse.json(
        { error: "goal_prompt is required" },
        { status: 400 },
      );
    }

    const campaign = createCampaign({ title, goal_prompt, mode });

    if (process.env.GEMINI_API_KEY) {
      try {
        const strategy = await generateCampaignStrategy({ title, goal_prompt });
        const result = updateCampaignStrategy(campaign.id, strategy, {
          withEvent: mode === "all",
        });
        if (!result.ok) {
          console.error("Failed to persist generated strategy:", result.reason);
        }
      } catch (err) {
        console.error("Gemini failed, falling back to mock:", err);
      }
    }

    return NextResponse.json(
      { campaign: listCampaigns().find((c) => c.id === campaign.id) },
      { status: 201 },
    );
  }

  if (!isFirebaseConfigured()) return firebaseNotConfigured();

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
  const ref = db.collection(COLLECTIONS.campaigns).doc();

  await ref.set({
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

  const created = await ref.get();
  return NextResponse.json(
    { campaign: snapshotToObject(created) },
    { status: 201 },
  );
}
