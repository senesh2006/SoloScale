import { NextResponse } from "next/server";
import {
  deleteReminder,
  getEvent,
  updateReminder,
  useMocks,
} from "@/lib/mock-store";

type Params = { params: Promise<{ id: string; reminderId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, reminderId } = await params;
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }
  if (!getEvent(id)) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const reminder = updateReminder(id, reminderId, {
    subject: body.subject !== undefined ? String(body.subject) : undefined,
    body: body.body !== undefined ? String(body.body) : undefined,
    enabled:
      body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    scheduled_for:
      body.scheduled_for !== undefined
        ? String(body.scheduled_for)
        : undefined,
  });

  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }
  return NextResponse.json({ reminder });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, reminderId } = await params;
  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }
  if (!getEvent(id)) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const ok = deleteReminder(id, reminderId);
  if (!ok) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
