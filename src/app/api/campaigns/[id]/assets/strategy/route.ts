import { NextResponse } from "next/server";

/**
 * POST /api/campaigns/[id]/assets/strategy
 *
 * Original implementation (on `main`) generated assets via the external
 * `soloscale-ai-service` and persisted them through the in-memory
 * `mock-store`. After the Firestore-only migration on `testing`, those
 * helpers no longer exist. Re-implement against Firestore + your AI
 * service before calling this route.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Strategy-driven asset generation hasn't been ported to Firestore yet. Use POST /api/campaigns/[id]/assets to create empty asset slots and fill them via your AI worker.",
    },
    { status: 501 },
  );
}
