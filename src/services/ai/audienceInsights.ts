import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { AudienceInsights } from "@/types/audienceInsights";
import type { FormResponseAnswer } from "@/types/formResponse";
import { GEMINI_TEXT_MODEL } from "@/services/ai/geminiModel";
import { tryAcrossGeminiKeys } from "@/services/ai/geminiKeyPool";
import { getGeminiApiKeys, hasGeminiApiKeys } from "@/services/ai/geminiKeys";

const audienceInsightsSchema = {
  description: "Audience analysis from anonymized registration form responses",
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description:
        "2–4 punchy sentences synthesizing who signed up and what they want",
    },
    key_segments: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "2–5 bullets: dominant roles, interests, or goals (use rough shares only when clearly inferable)",
    },
    content_recommendations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "3–6 specific ideas: agenda, keynote angle, marketing copy, session topics",
    },
    caveats: {
      type: SchemaType.STRING,
      description: "Sparse data, optional fields, or small sample — be honest",
    },
  },
  required: [
    "summary",
    "key_segments",
    "content_recommendations",
    "caveats",
  ],
} as unknown as Schema;

const MAX_RESPONDENTS = 200;
const MAX_ANSWER_CHARS = 400;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function formatAnswerValue(v: FormResponseAnswer["value"]): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function buildAnonymizedResponseDataset(
  responses: { answers: FormResponseAnswer[] }[],
): string {
  const sliced = responses.slice(0, MAX_RESPONDENTS);
  const blocks: string[] = [];
  sliced.forEach((r, i) => {
    const lines = (r.answers ?? []).map(
      (a) =>
        `  - ${a.label}: ${truncate(formatAnswerValue(a.value), MAX_ANSWER_CHARS)}`,
    );
    blocks.push(`Respondent ${i + 1}:\n${lines.join("\n")}`);
  });
  return blocks.join("\n\n");
}

export type AudienceInsightsGenerationInput = {
  eventHeadline: string;
  eventSubhead: string;
  formFieldSummary: string;
  totalRegistrations: number;
  responses: { answers: FormResponseAnswer[] }[];
};

function buildPrompt(input: AudienceInsightsGenerationInput): string {
  const dataset = buildAnonymizedResponseDataset(input.responses);
  return `You are an expert event marketer and community analyst.

The organizer runs a registration event. Below are ANONYMIZED custom form responses from registrants (no names or emails). Infer patterns, segments, and actionable recommendations for talks, content, and positioning.

RULES:
- Only use patterns visible in the data. If data is thin, say so in caveats.
- Quote approximate percentages only when clearly inferable from the answers (e.g. most rows mention the same role); otherwise use qualitative wording like "many" or "a strong subset".
- Recommendations must be concrete (e.g. "tilt the keynote toward React Server Components") not vague ("improve content").
- key_segments: 2–5 short bullet strings.
- content_recommendations: 3–6 bullets aligned with agenda, sessions, or marketing angles.

EVENT
Title: ${input.eventHeadline}
Subhead: ${input.eventSubhead}
Total registrations on the event: ${input.totalRegistrations}
Form responses included below: ${input.responses.length}

FORM FIELDS (schema context): ${input.formFieldSummary || "(infer from responses)"}

RESPONSES (anonymous):
${dataset || "(none)"}
`;
}

export function isAudienceInsightsAvailable(): boolean {
  return hasGeminiApiKeys();
}

async function generateWithKey(
  apiKey: string,
  prompt: string,
): Promise<AudienceInsights> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: audienceInsightsSchema,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty audience insights response");
  }

  const parsed = JSON.parse(text) as AudienceInsights;

  if (
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.key_segments) ||
    !Array.isArray(parsed.content_recommendations) ||
    typeof parsed.caveats !== "string"
  ) {
    throw new Error("Gemini returned an invalid audience insights structure");
  }

  return parsed;
}

export async function generateAudienceInsights(
  input: AudienceInsightsGenerationInput,
): Promise<AudienceInsights> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "Gemini API key not configured (GEMINI_API_KEY or SS_AI_SERVICE_GEMINI_API_KEY)",
    );
  }

  const prompt = buildPrompt(input);
  return tryAcrossGeminiKeys(keys, "audience-insights", (apiKey) =>
    generateWithKey(apiKey, prompt),
  );
}
