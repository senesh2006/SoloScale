import { NextResponse } from "next/server";
import { getEvent, updateEvent, useMocks } from "@/lib/mock-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Supabase — mock mode disabled" },
      { status: 501 },
    );
  }

  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Supabase — mock mode disabled" },
      { status: 501 },
    );
  }

  const event = updateEvent(id, {
    landing: body.landing,
    form_fields: body.form_fields,
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
