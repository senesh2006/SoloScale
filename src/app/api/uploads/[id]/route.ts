import { NextResponse } from "next/server";
import { getUpload } from "@/lib/upload-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const file = getUpload(id);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Disposition": `inline; filename="${file.filename}"`,
    },
  });
}
