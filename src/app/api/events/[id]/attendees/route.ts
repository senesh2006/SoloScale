import { NextResponse } from "next/server";
import { getEventAttendees, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const attendees = getEventAttendees(id);
  return NextResponse.json({ attendees });
}
