import { NextResponse } from "next/server";

/**
 * PATCH / DELETE /api/events/[id]/reminders/[reminderId]
 *
 * Reminders were stored in the in-memory `mock-store` on `main`. The
 * Firestore-backed version isn't built yet — see `../route.ts` for the
 * companion stub.
 */
export async function PATCH() {
  return NextResponse.json(
    { error: "Reminders aren't backed by Firestore yet." },
    { status: 501 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Reminders aren't backed by Firestore yet." },
    { status: 501 },
  );
}
