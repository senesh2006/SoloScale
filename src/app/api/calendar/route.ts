import { NextResponse } from "next/server";
import { getCalendarEntries, useMocks } from "@/lib/mock-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from =
    searchParams.get("from") ??
    new Date(Date.now() - 30 * 86400000).toISOString();
  const to =
    searchParams.get("to") ??
    new Date(Date.now() + 30 * 86400000).toISOString();

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Supabase — mock mode disabled" },
      { status: 501 },
    );
  }

  return NextResponse.json({ entries: getCalendarEntries(from, to) });
}
