import { NextResponse } from "next/server";
import {
  createCustomReminder,
  getEvent,
  listReminders,
  upsertPresetReminder,
  useMocks,
} from "@/lib/mock-store";
type Params = { params: Promise<{ id: string }> };

const PRESET_IDS = ["7d", "24h", "1h"] as const;

function isPresetId(v: string): v is (typeof PRESET_IDS)[number] {
  return (PRESET_IDS as readonly string[]).includes(v);
}

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
  return NextResponse.json({
    reminders: listReminders(id),
    event_date: event.event_date ?? null,
    event_title: event.landing.headline,
  });
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

  if (body.preset_id && isPresetId(String(body.preset_id))) {
    if (!event.event_date) {
      return NextResponse.json(
        { error: "Set an event date before scheduling reminders" },
        { status: 400 },
      );
    }
    const reminder = upsertPresetReminder(id, body.preset_id, {
      enabled: Boolean(body.enabled),
      subject: body.subject ? String(body.subject) : undefined,
      body: body.body ? String(body.body) : undefined,
    });
    return NextResponse.json({ reminder }, { status: 200 });
  }

  const scheduledFor = String(body.scheduled_for ?? "");
  const subject = String(body.subject ?? "").trim();
  const messageBody = String(body.body ?? "").trim();

  if (!scheduledFor || subject.length < 2 || messageBody.length < 4) {
    return NextResponse.json(
      { error: "scheduled_for, subject, and body are required" },
      { status: 400 },
    );
  }

  const reminder = createCustomReminder(id, {
    scheduled_for: scheduledFor,
    subject,
    body: messageBody,
    label: body.label ? String(body.label) : undefined,
  });

  if (!reminder) {
    return NextResponse.json(
      { error: "Could not create reminder" },
      { status: 400 },
    );
  }

  return NextResponse.json({ reminder }, { status: 201 });
}
