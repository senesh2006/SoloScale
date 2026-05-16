import { NextResponse } from "next/server";
import { getEventBySlug, registerAttendee, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await request.json();

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

  const name = (body.name as string)?.trim();
  const email = (body.email as string)?.trim();

  if (!name || !email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  const attendee = registerAttendee(event.id, { name, email });
  return NextResponse.json({ attendee, event: getEventBySlug(slug) }, { status: 201 });
}
