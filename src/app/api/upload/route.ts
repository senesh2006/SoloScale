import { NextResponse } from "next/server";
import { useMocks } from "@/lib/mock-store";
import { putUpload } from "@/lib/upload-store";
import { getAdminStorage } from "@/lib/firebase/admin";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const REAL_MAX_BYTES = 8 * 1024 * 1024;

function extFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' in multipart/form-data" },
      { status: 400 },
    );
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type ${file.type || "unknown"}` },
      { status: 415 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Mock mode → in-memory store served via /api/uploads/[id]
  if (useMocks()) {
    const result = putUpload({
      bytes,
      contentType: file.type,
      filename: file.name || `upload.${extFor(file.type)}`,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 413 });
    }
    return NextResponse.json({ url: result.url, id: result.id });
  }

  // Real mode → Firebase Storage
  if (bytes.byteLength > REAL_MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${REAL_MAX_BYTES / 1024 / 1024}MB upload limit` },
      { status: 413 },
    );
  }

  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const folder = (form?.get("folder") as string | null)?.trim() || "uploads";
    const safeFolder = folder.replace(/[^a-z0-9/_-]+/gi, "_");
    const objectName = `${safeFolder}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${extFor(file.type)}`;

    const blob = bucket.file(objectName);
    await blob.save(bytes, {
      contentType: file.type,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    await blob.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${encodeURI(
      objectName,
    )}`;
    return NextResponse.json({ url, objectName });
  } catch (err) {
    console.error("Firebase upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed — check storage bucket configuration" },
      { status: 500 },
    );
  }
}
