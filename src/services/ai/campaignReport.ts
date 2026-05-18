import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type {
  CampaignReportNarrative,
  CampaignReportPacket,
} from "@/types/campaignReport";
import { GEMINI_TEXT_MODEL } from "@/services/ai/geminiModel";
import { tryAcrossGeminiKeys } from "@/services/ai/geminiKeyPool";
import { getGeminiApiKeys, hasGeminiApiKeys } from "@/services/ai/geminiKeys";

const narrativeSchema = {
  description: "Structured narrative sections for a campaign report",
  type: SchemaType.OBJECT,
  properties: {
    executive_summary: {
      type: SchemaType.STRING,
      description: "2-4 sentence executive summary for stakeholders",
    },
    campaign_overview: {
      type: SchemaType.STRING,
      description: "Overview of goals, audience, and campaign status",
    },
    strategy_highlights: {
      type: SchemaType.STRING,
      description: "Highlights from the marketing strategy and content plan",
    },
    content_and_assets: {
      type: SchemaType.STRING,
      description: "Summary of creative assets and content produced",
    },
    performance_analysis: {
      type: SchemaType.STRING,
      description:
        "Performance interpretation using ONLY metrics from METRICS block",
    },
    insights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "3-6 actionable insights as bullet strings",
    },
    recommendations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "3-5 next-step recommendations as bullet strings",
    },
    limitations_note: {
      type: SchemaType.STRING,
      description:
        "Note any missing data (draft campaign, no events, no registrations)",
    },
  },
  required: [
    "executive_summary",
    "campaign_overview",
    "strategy_highlights",
    "content_and_assets",
    "performance_analysis",
    "insights",
    "recommendations",
    "limitations_note",
  ],
} as unknown as Schema;

export function isCampaignReportAvailable(): boolean {
  return hasGeminiApiKeys();
}

function buildReportPrompt(packet: CampaignReportPacket): string {
  return `You are writing a professional campaign report for an event organizer.

RULES:
- Use ONLY the numeric facts in the METRICS block for performance figures. Do not invent or estimate numbers.
- If metrics are zero or data is missing, state that clearly in performance_analysis and limitations_note.
- Write for stakeholders (sponsors, team leads). Professional, clear tone.
- Keep total prose under ~2000 words across all string fields.
- insights: 3-6 items; recommendations: 3-5 items.
- Never hallucinate registration counts, revenue, or conversion rates.

METRICS (authoritative — cite only these numbers):
${packet.metrics_for_ai}

CAMPAIGN DATA (JSON):
${JSON.stringify(packet, null, 2)}
`;
}

async function generateWithKey(
  apiKey: string,
  packet: CampaignReportPacket,
): Promise<CampaignReportNarrative> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: narrativeSchema,
    },
  });

  const result = await model.generateContent(buildReportPrompt(packet));
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty report response");
  }

  const parsed = JSON.parse(text) as CampaignReportNarrative;

  if (
    !parsed.executive_summary ||
    !Array.isArray(parsed.insights) ||
    !Array.isArray(parsed.recommendations)
  ) {
    throw new Error("Gemini returned an invalid report structure");
  }

  return parsed;
}

export async function generateCampaignReport(
  packet: CampaignReportPacket,
): Promise<CampaignReportNarrative> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "Gemini API key not configured (GEMINI_API_KEY or SS_AI_SERVICE_GEMINI_API_KEY)",
    );
  }

  return tryAcrossGeminiKeys(keys, "report", (apiKey) =>
    generateWithKey(apiKey, packet),
  );
}
