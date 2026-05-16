import { NextResponse } from "next/server";
import { getEventBySlug, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const event = getEventBySlug(slug);
  if (!event || !event.published) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
