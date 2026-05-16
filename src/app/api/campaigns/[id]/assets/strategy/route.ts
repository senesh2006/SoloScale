import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { generateAssetsFromStrategy } from "@/services/ai/gemini";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { snapshotToObject } from "@/lib/firestore/serialize";
import { getOwnedCampaign } from "@/lib/firestore/queries";
import {
  AI_TIMEOUT,
  aiFetchJson,
  isAiServiceEnabled,
} from "@/lib/ai-service-client";
import { writeReadyAsset } from "@/lib/apply-ai-to-campaign";
import type {
  AssetKind,
  CampaignStrategy,
  FlyerInput,
  VoiceoverInput,
} from "@/types/campaign";
import type { Dev1SavedAsset } from "@/types/dev1-ai";

type Params = { params: Promise<{ id: string }> };

async function listAssets(
  db: FirebaseFirestore.Firestore,
  campaignId: string,
) {
  const snap = await db
    .collection(COLLECTIONS.assets)
    .where("campaign_id", "==", campaignId)
    .limit(200)
    .get();
  return snap.docs
    .map((d) =>
      snapshotToObject<Record<string, unknown>>({
        id: d.id,
        data: () => d.data(),
      }),
    )
    .filter((a): a is Record<string, unknown> & { id: string } => Boolean(a))
    .sort((a, b) => {
      const at = String(a.created_at ?? "");
      const bt = String(b.created_at ?? "");
      return bt.localeCompare(at);
    });
}

async function writePendingAsset(
  db: FirebaseFirestore.Firestore,
  args: {
    campaignId: string;
    userId: string;
    kind: AssetKind;
    label?: string;
    prompt?: string;
    voice_id?: string;
  },
): Promise<void> {
  const ref = db.collection(COLLECTIONS.assets).doc();
  await ref.set({
    campaign_id: args.campaignId,
    user_id: args.userId,
    kind: args.kind,
    status: "pending",
    url: null,
    thumbnail_url: null,
    error_message: null,
    label: args.label ?? null,
    prompt: args.prompt ?? null,
    voice_id: args.voice_id ?? null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
}

/**
 * POST /api/campaigns/[id]/assets/strategy
 *
 * Generates a strategy-aligned brief (flyer prompt + voiceover script) using
 * Gemini, then either:
 *   - returns the brief if `preview: true`, or
 *   - calls the AI service to render the brief into hosted assets (when
 *     `AI_SERVICE_URL` is set), or
 *   - persists `pending` assets carrying the brief (so the UI shows them
 *     immediately and a worker can fill in URLs later).
 *
 * Body: `{ kind?: "flyer" | "voiceover" | "both", preview?: boolean }`
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }
  const campaign = owned.data;
  const strategy = campaign.strategy_json as CampaignStrategy | null;

  if (!strategy || campaign.status === "draft") {
    return NextResponse.json(
      { error: "Generate your strategy first" },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: AssetKind | "both";
    preview?: boolean;
  };
  const kind = body.kind ?? "both";
  const preview = body.preview === true;

  let brief: { flyer: FlyerInput; voice: VoiceoverInput };
  try {
    brief = await generateAssetsFromStrategy({
      title: campaign.title as string,
      goal_prompt: campaign.goal_prompt as string,
      strategy,
    });
  } catch (err) {
    console.error("Failed to generate strategy-aligned brief:", err);
    return NextResponse.json(
      { error: "Could not produce an asset brief from your strategy." },
      { status: 502 },
    );
  }

  if (preview) {
    if (kind === "flyer") return NextResponse.json({ flyer: brief.flyer });
    if (kind === "voiceover")
      return NextResponse.json({ voice: brief.voice });
    return NextResponse.json(brief);
  }

  // ---------- AI service path: render the brief into hosted assets ----------
  if (isAiServiceEnabled()) {
    try {
      const tasks: Promise<unknown>[] = [];

      if (kind === "flyer" || kind === "both") {
        tasks.push(
          (async () => {
            const { asset } = await aiFetchJson<{ asset: Dev1SavedAsset }>(
              "/api/flyer",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(brief.flyer),
                timeoutMs: AI_TIMEOUT.campaign,
              },
            );
            await writeReadyAsset(db, {
              campaignId: id,
              userId,
              kind: "flyer",
              url: asset.url,
              thumbnail_url: asset.url,
              prompt: brief.flyer.prompt,
              label: brief.flyer.label ?? "Strategy flyer",
            });
          })(),
        );
      }
      if (kind === "voiceover" || kind === "both") {
        tasks.push(
          (async () => {
            const { asset } = await aiFetchJson<{ asset: Dev1SavedAsset }>(
              "/api/voiceover",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  script: brief.voice.script,
                  ...(brief.voice.voice_id
                    ? { voiceName: brief.voice.voice_id }
                    : {}),
                }),
                timeoutMs: AI_TIMEOUT.campaign,
              },
            );
            await writeReadyAsset(db, {
              campaignId: id,
              userId,
              kind: "voiceover",
              url: asset.url,
              prompt: brief.voice.script,
              label: brief.voice.label ?? "Strategy voice-over",
              voice_id: brief.voice.voice_id,
            });
          })(),
        );
      }

      const results = await Promise.allSettled(tasks);
      const allFailed = results.every((r) => r.status === "rejected");
      if (!allFailed) {
        return NextResponse.json(
          { assets: await listAssets(db, id), ...brief },
          { status: 202 },
        );
      }
      console.error(
        "AI service failed for strategy assets, falling back to pending:",
        results,
      );
      // fall through
    } catch (err) {
      console.error(
        "Unexpected AI service error in strategy assets, falling back:",
        err,
      );
    }
  }

  // ---------- Pending placeholder fallback ----------
  if (kind === "flyer" || kind === "both") {
    await writePendingAsset(db, {
      campaignId: id,
      userId,
      kind: "flyer",
      label: brief.flyer.label ?? "Strategy flyer",
      prompt: brief.flyer.prompt,
    });
  }
  if (kind === "voiceover" || kind === "both") {
    await writePendingAsset(db, {
      campaignId: id,
      userId,
      kind: "voiceover",
      label: brief.voice.label ?? "Strategy voice-over",
      prompt: brief.voice.script,
      voice_id: brief.voice.voice_id,
    });
  }

  return NextResponse.json(
    { assets: await listAssets(db, id), ...brief },
    { status: 202 },
  );
}
