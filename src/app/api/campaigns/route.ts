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
import {
  AI_TIMEOUT,
  aiFetchJson,
  isAiServiceEnabled,
} from "@/lib/ai-service-client";
import { applyDev1ToCampaign } from "@/lib/apply-ai-to-campaign";
import { normalizeEventDate } from "@/lib/adapters/dev1StrategyToDashboard";
import type {
  Dev1CampaignResponse,
  Dev1CampaignStrategy,
} from "@/types/dev1-ai";
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
 *
 * Creates a campaign owned by the authenticated user. Strategy + asset
 * generation order:
 *
 *   1. If `AI_SERVICE_URL` is set → call `soloscale-ai-service` for the full
 *      Dev1 strategy (and hero flyer/voiceover when `mode === "all"`), then
 *      persist via `applyDev1ToCampaign` (writes to Firestore).
 *   2. Otherwise, fall back to direct Gemini for a strategy.
 *   3. Otherwise, the campaign is saved as `draft` and the client is expected
 *      to trigger generation via `/api/campaigns/[id]/strategy/refine`.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const json = await request.json().catch(() => ({}));
  const userId = await resolveUserId(request, json);
  if (!userId) return unauthorized();

  const parsed = createCampaignSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.join(".") ?? "(root)";
    const message = first?.message ?? "Invalid payload";
    return NextResponse.json(
      {
        error: `Invalid payload — ${path}: ${message}`,
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const voiceName =
    typeof json.voice_name === "string" ? json.voice_name.trim() : undefined;

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
    event_ids: [],
    event_date: input.event_date
      ? Timestamp.fromDate(new Date(input.event_date))
      : null,
    audience: input.audience ?? null,
    flyer_input: input.flyer_input ?? null,
    voice_input: input.voice_input ?? null,
    ai_hero: null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  let appliedStrategy: CampaignStrategy | null = null;
  const eventDateNormalized = normalizeEventDate(
    input.event_date ?? json.eventDate,
  );

  // --- Path 1: external AI service (preferred when configured) ---
  if (
    isAiServiceEnabled() &&
    (input.mode === "all" || input.mode === "strategy")
  ) {
    try {
      if (input.mode === "all") {
        const data = await aiFetchJson<Dev1CampaignResponse>("/api/campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: input.goal_prompt,
            eventDate: eventDateNormalized,
            audience: input.audience ?? undefined,
            voiceName,
          }),
          timeoutMs: AI_TIMEOUT.campaign,
        });
        appliedStrategy = await applyDev1ToCampaign(db, campaignRef.id, {
          userId,
          title: input.title,
          goal_prompt: input.goal_prompt,
          mode: "all",
          dev1Strategy: data.strategy,
          assets: data.assets,
        });
      } else {
        const data = await aiFetchJson<{ strategy: Dev1CampaignStrategy }>(
          "/api/strategy",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goal: input.goal_prompt,
              eventDate: eventDateNormalized,
              audience: input.audience ?? undefined,
            }),
            timeoutMs: AI_TIMEOUT.default,
          },
        );
        appliedStrategy = await applyDev1ToCampaign(db, campaignRef.id, {
          userId,
          title: input.title,
          goal_prompt: input.goal_prompt,
          mode: "strategy",
          dev1Strategy: data.strategy,
        });
      }
    } catch (err) {
      console.error(
        "AI service failed during campaign create — falling back:",
        err,
      );
    }
  }

  // --- Path 2: direct Gemini fallback ---
  // Only runs if path 1 didn't even start writing — once the AI service path
  // has applied a strategy or created an event, we never re-enter this block.
  // Reread `event_id` from Firestore to avoid double-creating an event when
  // path 1 produced one but threw during a later step.
  let alreadyHasEvent = false;
  if (!appliedStrategy) {
    const cur = (await campaignRef.get()).data() ?? {};
    alreadyHasEvent = Boolean(cur.event_id);
    if (cur.strategy_json) {
      // Path 1 succeeded enough to persist the strategy — treat this as
      // applied so the fallback doesn't overwrite it.
      appliedStrategy = cur.strategy_json as CampaignStrategy;
    }
  }

  if (
    !appliedStrategy &&
    process.env.GEMINI_API_KEY &&
    input.mode !== "flyer" &&
    input.mode !== "voice"
  ) {
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
      appliedStrategy = strategy;

      if (input.mode === "all" && !alreadyHasEvent) {
        await createEventFromStrategy(db, {
          campaignId: campaignRef.id,
          title: input.title,
          strategy,
        });
      }
    } catch (err) {
      console.error("Gemini failed — campaign saved as draft:", err);
    }
  }

  const created = await campaignRef.get();
  return NextResponse.json(
    { campaign: snapshotToObject(created) },
    { status: 201 },
  );
}
