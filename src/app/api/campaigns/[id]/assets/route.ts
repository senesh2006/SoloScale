import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type {
  AssetKind,
  CampaignFlyerInput,
  CampaignVoiceInput,
  FlyerInput,
  VoiceoverInput,
} from "@/types/campaign";
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
import type { Dev1SavedAsset } from "@/types/dev1-ai";

type Params = { params: Promise<{ id: string }> };

async function generateFlyerViaAi(input: FlyerInput): Promise<Dev1SavedAsset> {
  const { asset } = await aiFetchJson<{ asset: Dev1SavedAsset }>(
    "/api/flyer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      timeoutMs: AI_TIMEOUT.campaign,
    },
  );
  return asset;
}

async function generateVoiceViaAi(
  script: string,
  voiceName?: string,
): Promise<Dev1SavedAsset & { durationMs?: number }> {
  const { asset } = await aiFetchJson<{
    asset: Dev1SavedAsset & { durationMs?: number };
  }>("/api/voiceover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      script,
      ...(voiceName ? { voiceName } : {}),
    }),
    timeoutMs: AI_TIMEOUT.campaign,
  });
  return asset;
}

async function listCampaignAssets(
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

/**
 * GET /api/campaigns/[id]/assets
 * Lists assets for a campaign. Auth: campaign owner.
 */
export async function GET(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const assets = await listCampaignAssets(db, id);
  return NextResponse.json({ assets });
}

/**
 * POST /api/campaigns/[id]/assets
 *
 * Behaviour:
 *  - When `AI_SERVICE_URL` is set we call `soloscale-ai-service` and write
 *    `status: "ready"` assets pointing at the hosted result.
 *  - Otherwise we create `status: "pending"` placeholders so a downstream
 *    worker (or the UI) can fill them in later.
 *
 * Body:
 *  - `{ kind?: "flyer" | "voiceover", flyer?: FlyerInput, voice?: VoiceInput }`
 *  - Omit `kind` to create both.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    kind?: AssetKind;
    flyer?: FlyerInput;
    voice?: VoiceoverInput;
  };

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }
  const campaign = owned.data;

  // ---------- AI service path ----------
  if (isAiServiceEnabled()) {
    try {
      // Single-asset request with explicit input.
      if (body.kind === "flyer" && body.flyer) {
        const asset = await generateFlyerViaAi(body.flyer);
        await writeReadyAsset(db, {
          campaignId: id,
          userId,
          kind: "flyer",
          url: asset.url,
          thumbnail_url: asset.url,
          prompt: body.flyer.prompt,
          label: body.flyer.label,
        });
        return NextResponse.json(
          { assets: await listCampaignAssets(db, id) },
          { status: 201 },
        );
      }

      if (body.kind === "voiceover" && body.voice) {
        const asset = await generateVoiceViaAi(
          body.voice.script,
          body.voice.voice_id,
        );
        await writeReadyAsset(db, {
          campaignId: id,
          userId,
          kind: "voiceover",
          url: asset.url,
          prompt: body.voice.script,
          label: body.voice.label,
          voice_id: body.voice.voice_id,
        });
        return NextResponse.json(
          { assets: await listCampaignAssets(db, id) },
          { status: 201 },
        );
      }

      // Both-assets path: rebuild from `ai_hero` (set by applyDev1ToCampaign).
      const heroFlyer = (campaign.flyer_input ?? null) as
        | CampaignFlyerInput
        | null;
      const heroVoice = (campaign.voice_input ?? null) as
        | CampaignVoiceInput
        | null;
      const aiHero = (campaign.ai_hero ?? null) as
        | { flyer?: FlyerInput; voiceScript?: string; voiceName?: string }
        | null;

      const flyerInput: FlyerInput | null =
        body.flyer ??
        aiHero?.flyer ??
        (heroFlyer
          ? {
              prompt: heroFlyer.visual_prompt,
              headline: heroFlyer.headline,
              subtext: heroFlyer.subtext,
            }
          : null);

      const voiceScript: string | null =
        body.voice?.script ??
        aiHero?.voiceScript ??
        heroVoice?.script ??
        null;
      const voiceName: string | undefined =
        body.voice?.voice_id ??
        aiHero?.voiceName ??
        heroVoice?.voice_id ??
        undefined;

      const tasks = await Promise.allSettled([
        flyerInput
          ? generateFlyerViaAi(flyerInput)
          : Promise.reject(new Error("No flyer prompt available")),
        voiceScript
          ? generateVoiceViaAi(voiceScript, voiceName)
          : Promise.reject(new Error("No voiceover script available")),
      ]);

      const [flyerResult, voiceResult] = tasks;
      if (flyerResult.status === "fulfilled" && flyerInput) {
        await writeReadyAsset(db, {
          campaignId: id,
          userId,
          kind: "flyer",
          url: flyerResult.value.url,
          thumbnail_url: flyerResult.value.url,
          prompt: flyerInput.prompt,
          label: flyerInput.label ?? "Hero flyer",
        });
      }
      if (voiceResult.status === "fulfilled" && voiceScript) {
        await writeReadyAsset(db, {
          campaignId: id,
          userId,
          kind: "voiceover",
          url: voiceResult.value.url,
          prompt: voiceScript,
          label: "Hero voice-over",
          voice_id: voiceName,
        });
      }

      if (
        flyerResult.status === "rejected" &&
        voiceResult.status === "rejected"
      ) {
        throw flyerResult.reason instanceof Error
          ? flyerResult.reason
          : new Error("AI asset generation failed");
      }

      return NextResponse.json(
        { assets: await listCampaignAssets(db, id) },
        { status: 201 },
      );
    } catch (err) {
      console.error("AI asset generation failed, falling back to pending:", err);
      // fall through to pending-placeholder behaviour
    }
  }

  // ---------- Pending placeholder fallback ----------
  const kinds: AssetKind[] =
    body.kind === "flyer" || body.kind === "voiceover"
      ? [body.kind]
      : ["flyer", "voiceover"];

  for (const kind of kinds) {
    const ref = db.collection(COLLECTIONS.assets).doc();
    await ref.set({
      campaign_id: id,
      user_id: userId,
      kind,
      status: "pending",
      url: null,
      thumbnail_url: null,
      error_message: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  return NextResponse.json(
    { assets: await listCampaignAssets(db, id) },
    { status: 202 },
  );
}
