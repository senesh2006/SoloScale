import { NextResponse } from "next/server";
import {
  AI_TIMEOUT,
  aiFetchJson,
  isAiServiceEnabled,
} from "@/lib/ai-service-client";
import {
  addAsset,
  addReadyAsset,
  getCampaign,
  getCampaignAssets,
  useMocks,
} from "@/lib/mock-store";
import type { AssetKind, FlyerInput, VoiceoverInput } from "@/types/campaign";
import type { Dev1SavedAsset } from "@/types/dev1-ai";

type Params = { params: Promise<{ id: string }> };

async function generateFlyerViaAi(input: FlyerInput): Promise<Dev1SavedAsset> {
  const data = await aiFetchJson<{ asset: Dev1SavedAsset }>("/api/flyer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: AI_TIMEOUT.campaign,
  });
  return data.asset;
}

async function generateVoiceViaAi(
  script: string,
  voiceName?: string,
): Promise<Dev1SavedAsset & { durationMs?: number }> {
  const data = await aiFetchJson<{
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
  return data.asset;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  if (!getCampaign(id)) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ assets: getCampaignAssets(id) });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const campaign = getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status === "draft") {
    return NextResponse.json(
      { error: "Strategy not ready yet" },
      { status: 409 },
    );
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as {
    kind?: AssetKind;
    flyer?: FlyerInput;
    voice?: VoiceoverInput;
  };

  if (isAiServiceEnabled()) {
    try {
      if (body?.kind === "flyer" && body.flyer) {
        const asset = await generateFlyerViaAi(body.flyer);
        const assets = addReadyAsset(id, "flyer", {
          url: asset.url,
          thumbnail_url: asset.url,
          prompt: body.flyer.prompt,
          label: body.flyer.label,
        });
        return NextResponse.json({ assets }, { status: 201 });
      }

      if (body?.kind === "voiceover" && body.voice) {
        const asset = await generateVoiceViaAi(
          body.voice.script,
          body.voice.voice_id,
        );
        const assets = addReadyAsset(id, "voiceover", {
          url: asset.url,
          prompt: body.voice.script,
          label: body.voice.label,
          voice_id: body.voice.voice_id,
        });
        return NextResponse.json({ assets }, { status: 201 });
      }

      const hero = campaign.ai_hero;
      const [flyerResult, voiceResult] = await Promise.allSettled([
        hero?.flyer
          ? generateFlyerViaAi(hero.flyer)
          : Promise.reject(new Error("No flyer prompt")),
        hero?.voiceScript
          ? generateVoiceViaAi(hero.voiceScript, hero.voiceName)
          : Promise.reject(new Error("No voice script")),
      ]);

      if (flyerResult.status === "fulfilled") {
        addReadyAsset(id, "flyer", {
          url: flyerResult.value.url,
          thumbnail_url: flyerResult.value.url,
          prompt: hero?.flyer?.prompt,
          label: "Hero flyer",
        });
      }
      if (voiceResult.status === "fulfilled") {
        addReadyAsset(id, "voiceover", {
          url: voiceResult.value.url,
          prompt: hero?.voiceScript,
          label: "Hero voice-over",
          voice_id: hero?.voiceName,
        });
      }

      if (
        flyerResult.status === "rejected" &&
        voiceResult.status === "rejected"
      ) {
        throw new Error(
          flyerResult.reason instanceof Error
            ? flyerResult.reason.message
            : "Asset generation failed",
        );
      }

      return NextResponse.json(
        { assets: getCampaignAssets(id) },
        { status: 201 },
      );
    } catch (err) {
      console.error("AI asset generation failed, using mock:", err);
    }
  }

  const assets =
    body?.kind === "flyer" || body?.kind === "voiceover"
      ? addAsset(id, body.kind, { flyer: body.flyer, voice: body.voice })
      : (() => {
          addAsset(id, "flyer");
          return addAsset(id, "voiceover");
        })();

  return NextResponse.json({ assets }, { status: 202 });
}
