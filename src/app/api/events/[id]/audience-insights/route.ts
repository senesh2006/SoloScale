import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { getOwnedEvent } from "@/lib/firestore/queries";
import type { FormResponseAnswer } from "@/types/formResponse";
import {
  generateAudienceInsights,
  isAudienceInsightsAvailable,
} from "@/services/ai/audienceInsights";

type Params = { params: Promise<{ id: string }> };

type FormFieldRow = { label?: string; type?: string };

/**
 * POST /api/events/[id]/audience-insights
 * Batch-anonymizes form_responses for the event and returns Gemini audience insights.
 * Auth: event owner. Uses the same Gemini key pool as chat/reports.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const { id: eventId } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  if (!isAudienceInsightsAvailable()) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GEMINI_API_KEY or SS_AI_SERVICE_GEMINI_API_KEY (see .env.example).",
      },
      { status: 503 },
    );
  }

  const db = getAdminDb();
  const owned = await getOwnedEvent(db, eventId, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const event = owned.data;
  const landing = (event.landing ?? {}) as { headline?: string; subhead?: string };
  const headline = String(landing.headline ?? "Event");
  const subhead = String(landing.subhead ?? "");
  const formFields = (event.form_fields ?? []) as FormFieldRow[];
  const formFieldSummary = formFields
    .map((f) => `${f.label ?? "Field"} (${f.type ?? "text"})`)
    .join(", ");
  const totalRegistrations = Number(event.attendee_count ?? 0);

  const respSnap = await db
    .collection(COLLECTIONS.form_responses)
    .where("event_id", "==", eventId)
    .get();

  const responses = respSnap.docs.map((doc) => {
    const data = doc.data();
    const raw = data.answers;
    const answers = Array.isArray(raw)
      ? (raw as FormResponseAnswer[])
      : [];
    return { answers };
  });

  const withAnswers = responses.filter((r) => r.answers.length > 0);

  if (withAnswers.length === 0) {
    return NextResponse.json(
      {
        error:
          "No custom form responses yet. When attendees complete registration questions, you can analyze them here.",
      },
      { status: 400 },
    );
  }

  try {
    const insight = await generateAudienceInsights({
      eventHeadline: headline,
      eventSubhead: subhead,
      formFieldSummary,
      totalRegistrations,
      responses: withAnswers,
    });

    return NextResponse.json({
      insight,
      response_count: withAnswers.length,
    });
  } catch (err) {
    console.error("[audience-insights]", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate insights";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
