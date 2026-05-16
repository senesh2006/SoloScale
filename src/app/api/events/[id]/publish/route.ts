import { NextResponse } from "next/server";
import { publishEvent, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const event = publishEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
