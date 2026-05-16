import { NextResponse } from "next/server";
import { getAttendeeByTicket, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const result = getAttendeeByTicket(code);
  if (!result) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
