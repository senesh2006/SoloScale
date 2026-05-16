import { NextResponse } from "next/server";
import { analyzeCampaignSketch } from "@/services/ai/gemini-vision";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/heic"]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Upload a photo (whiteboard, napkin sketch, or notes)." },
      { status: 400 },
    );
  }

  if (!ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WebP photo." },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 4 MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageBase64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  try {
    const seed = await analyzeCampaignSketch({ imageBase64, mimeType });
    return NextResponse.json({ seed });
  } catch (err) {
    console.error("Vision seed error:", err);
    return NextResponse.json(
      { error: "Could not read the sketch. Try a clearer photo." },
      { status: 502 },
    );
  }
}
