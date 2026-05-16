import { NextResponse } from "next/server";
import { getEvent, updateEvent, useMocks } from "@/lib/mock-store";
import type {
  EventMedia,
  EventPrice,
  FormField,
  Sponsor,
  SponsorDisplay,
} from "@/types/campaign";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  landing?: { headline: string; subhead: string; body_md: string };
  form_fields?: FormField[];
  price?: EventPrice | null;
  media?: EventMedia;
  sponsors?: Sponsor[];
  sponsors_display?: SponsorDisplay;
  event_date?: string | null;
  location?: string | null;
};

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

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  if (!useMocks()) {
    return NextResponse.json(
      { error: "Connect Firebase — mock mode disabled" },
      { status: 501 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as PatchBody;

  if (
    body.sponsors_display !== undefined &&
    body.sponsors_display !== "grid" &&
    body.sponsors_display !== "carousel"
  ) {
    return NextResponse.json(
      { error: "sponsors_display must be 'grid' or 'carousel'" },
      { status: 400 },
    );
  }

  const event = updateEvent(id, {
    landing: body.landing,
    form_fields: body.form_fields,
    price: body.price,
    media: body.media,
    sponsors: body.sponsors,
    sponsors_display: body.sponsors_display,
    event_date: body.event_date,
    location: body.location,
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
