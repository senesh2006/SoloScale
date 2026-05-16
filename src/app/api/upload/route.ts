import { NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_BYTES = 8 * 1024 * 1024;

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

/**
 * POST /api/upload  (multipart/form-data: `file`, optional `folder`)
 * Uploads an image to Firebase Storage and returns its public URL.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

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
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024}MB upload limit` },
      { status: 413 },
    );
  }

  try {
    const bucket = getAdminStorage().bucket();
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
