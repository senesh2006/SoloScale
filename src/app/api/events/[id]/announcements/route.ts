import { NextResponse } from "next/server";
import {
  createAnnouncement,
  getEvent,
  listAnnouncements,
  useMocks,
} from "@/lib/mock-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ announcements: listAnnouncements(id) });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject ?? "").trim();
  const messageBody = String(body.body ?? "").trim();
  const channel = body.channel === "in_app" ? "in_app" : "email";

  if (subject.length < 2 || subject.length > 140) {
    return NextResponse.json(
      { error: "Subject must be 2–140 characters" },
      { status: 400 },
    );
  }
  if (messageBody.length < 4) {
    return NextResponse.json(
      { error: "Message body is too short" },
      { status: 400 },
    );
  }

  const announcement = createAnnouncement(id, {
    subject,
    body: messageBody,
    channel,
  });
  return NextResponse.json({ announcement }, { status: 201 });
}
