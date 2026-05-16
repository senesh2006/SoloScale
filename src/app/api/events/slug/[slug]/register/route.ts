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
  const metadata =
    body.metadata && typeof body.metadata === "object"
      ? (Object.fromEntries(
          Object.entries(body.metadata as Record<string, unknown>).map(
            ([k, v]) => [k, String(v)],
          ),
        ) as Record<string, string>)
      : undefined;

  if (!name || !email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  const attendee = registerAttendee(event.id, { name, email, metadata });
  return NextResponse.json(
    { attendee, event: getEventBySlug(slug) },
    { status: 201 },
  );
}
