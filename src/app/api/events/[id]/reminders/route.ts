import { NextResponse } from "next/server";

/**
 * GET / POST /api/events/[id]/reminders
 *
 * Reminders were stored in the in-memory `mock-store` on `main`. The
 * Firestore-backed version of this feature isn't built yet — once the
 * `event_reminders` collection is defined, replace this stub.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Reminders aren't backed by Firestore yet. Add an `event_reminders` collection and re-implement this route.",
    },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Reminders aren't backed by Firestore yet.",
    },
    { status: 501 },
  );
}
