import { NextResponse } from "next/server";
import {
  aiFetchMultipart,
  isAiServiceEnabled,
} from "@/lib/ai-service-client";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { VisionCampaignSeed } from "@/types/dev1-ai";

export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  if (!isAiServiceEnabled()) {
    return NextResponse.json(
      { error: "AI service is disabled. Set AI_SERVICE_URL in .env.local." },
      { status: 503 },
    );
  }

  const incoming = await request.formData();
  const image = incoming.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: 'Missing required file field "image".' },
      { status: 400 },
    );
  }

  const form = new FormData();
  form.append("image", image, image.name || "sketch.jpg");
  const hint = incoming.get("hint");
  if (typeof hint === "string" && hint.trim()) {
    form.append("hint", hint.trim());
  }

  const data = await aiFetchMultipart<{ seed: VisionCampaignSeed }>(
    "/api/vision/campaign-seed",
    form,
  );

  return NextResponse.json(data);
}
