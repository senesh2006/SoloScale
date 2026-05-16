import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { GEMINI_TEXT_MODEL } from "@/services/ai/geminiModel";
import type { VisionCampaignSeed } from "@/types/vision";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const visionSeedSchema = {
  description: "Structured campaign fields extracted from a photo of a whiteboard or sketch",
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "Short campaign title, max 80 chars",
    },
    goal: {
      type: SchemaType.STRING,
      description: "1-3 sentences describing the campaign goal in first person or organizer voice",
    },
    audience: {
      type: SchemaType.STRING,
      description: "Target audience, concise phrase",
    },
    event_date: {
      type: SchemaType.STRING,
      description:
        "ISO 8601 datetime if a date/time is visible or strongly implied, else empty string",
    },
    board_summary: {
      type: SchemaType.STRING,
      description: "One sentence describing what you see on the board/sketch",
    },
    confidence: {
      type: SchemaType.STRING,
      enum: ["high", "medium", "low"],
    },
  },
  required: ["title", "goal", "audience", "event_date", "board_summary", "confidence"],
} as unknown as Schema;

export async function analyzeCampaignSketch(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<VisionCampaignSeed> {
  if (!process.env.GEMINI_API_KEY) {
    return mockVisionSeed();
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: visionSeedSchema,
      },
    });

    const prompt = `
      You are helping an event organizer digitize a hand-drawn campaign plan.
      The user photographed a whiteboard, napkin sketch, sticky notes, or notebook page.

      Extract a marketing campaign seed:
      - title: short name for the campaign/event
      - goal: what they are trying to achieve (complete sentences)
      - audience: who it is for
      - event_date: ISO 8601 if you can read a date/time on the board; otherwise ""
      - board_summary: briefly describe what is on the board
      - confidence: high if text is clear, medium if partial, low if very unclear

      Infer reasonable marketing language even if handwriting is messy.
      Do not invent a specific venue unless implied. Today's reference year is ${new Date().getFullYear()}.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: input.mimeType,
          data: input.imageBase64,
        },
      },
      { text: prompt },
    ]);

    return normalizeVisionSeed(JSON.parse(result.response.text()));
  } catch (err) {
    console.error("Gemini vision seed failed, falling back to mock:", err);
    return mockVisionSeed();
  }
}

function normalizeVisionSeed(raw: unknown): VisionCampaignSeed {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const eventRaw = String(o.event_date ?? "").trim();
  let event_date: string | null = null;
  if (eventRaw) {
    const d = new Date(eventRaw);
    if (!Number.isNaN(d.getTime())) event_date = d.toISOString();
  }

  const conf = String(o.confidence ?? "medium");
  const confidence =
    conf === "high" || conf === "low" ? conf : ("medium" as const);

  return {
    title: String(o.title ?? "Workshop launch").trim().slice(0, 80) || "New campaign",
    goal:
      String(o.goal ?? "").trim() ||
      "Launch a community event and fill registrations over the next two weeks.",
    audience: String(o.audience ?? "").trim() || "Local professionals and enthusiasts",
    event_date,
    board_summary:
      String(o.board_summary ?? "").trim() ||
      "Hand-drawn plan with event theme, timeline, and audience notes.",
    confidence,
  };
}

function mockVisionSeed(): VisionCampaignSeed {
  const inTenDays = new Date(Date.now() + 86400000 * 10);
  return {
    title: "React Summit 2026",
    goal: "Host a virtual React conference for frontend developers. Drive signups with a two-week social push and a polished landing page.",
    audience: "Frontend engineers and tech leads",
    event_date: inTenDays.toISOString(),
    board_summary:
      "Whiteboard sketch with event name, date box, audience arrow, and bullet list of promo channels.",
    confidence: "medium",
  };
}
