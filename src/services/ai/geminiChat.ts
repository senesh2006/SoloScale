import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import { getGeminiApiKeys } from "@/services/ai/geminiKeys";
import { tryAcrossGeminiKeys } from "@/services/ai/geminiKeyPool";
import { GEMINI_TEXT_MODEL } from "@/services/ai/geminiModel";

export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

const BASE_SYSTEM =
  "You are a concise, friendly assistant for SoloScale — AI-assisted marketing campaigns and event landing pages.\n" +
  "Help with messaging, strategy, registration forms, and how to use the product. Prefer short paragraphs or bullets.\n\n" +
  "IMPORTANT: You can see the user's campaigns in the context block (titles, goals, status, ids). " +
  "You do NOT have access to attendees, registrations, ticket holders, or any participant data — never invent or guess counts.\n" +
  "If asked about RSVPs or attendees, say they should open the campaign's event page in the dashboard to see that data.\n\n" +
  "When the user clearly asks you to create or start a new campaign, call the create_campaign tool with a sensible title and goal. " +
  "Confirm briefly after it succeeds (the tool result includes a link path).";

const createCampaignDeclaration: FunctionDeclaration = {
  name: "create_campaign",
  description:
    "Create a new campaign when the user explicitly wants one (e.g. 'create a campaign for…', 'start a new campaign about…'). Requires title and goal.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: "Short campaign name",
      },
      goal_prompt: {
        type: SchemaType.STRING,
        description: "Objectives, audience, and key details for AI generation",
      },
      mode: {
        type: SchemaType.STRING,
        description:
          "Use 'all' (default) for full strategy + event draft, or 'strategy' for strategy only.",
      },
    },
    required: ["title", "goal_prompt"],
  },
};

export type CreateCampaignToolResult =
  | { ok: true; campaignId: string; dashboardUrl: string }
  | { ok: false; error: string };

export type GeminiAssistantTurnResult = {
  content: string;
  campaignCreated?: { campaignId: string; dashboardUrl: string };
};

function buildSystemInstruction(campaignContextBlock: string): string {
  const ctx =
    campaignContextBlock.trim() ||
    "(No campaigns yet — you can offer to create one.)";
  return `${BASE_SYSTEM}\n\n---\n## User campaigns (no participant data):\n${ctx}\n---`;
}

export async function runGeminiAssistantTurn(args: {
  messages: ChatTurn[];
  campaignContextBlock: string;
  executeCreateCampaign: (input: {
    title: string;
    goal_prompt: string;
    mode?: string;
  }) => Promise<CreateCampaignToolResult>;
}): Promise<GeminiAssistantTurnResult> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys configured (set GEMINI_API_KEY in .env.local)",
    );
  }

  const sanitized = args.messages.map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));

  const lastIdx = sanitized.length - 1;
  if (lastIdx < 0 || sanitized[lastIdx]!.role !== "user") {
    throw new Error("Last message must be from the user");
  }

  const prior = sanitized.slice(0, lastIdx);
  const lastUser = sanitized[lastIdx]!.content;
  if (!lastUser) {
    throw new Error("Message cannot be empty");
  }

  const systemInstruction = buildSystemInstruction(args.campaignContextBlock);

  return tryAcrossGeminiKeys(keys, "chat", async (apiKey) => {
    let campaignCreated: GeminiAssistantTurnResult["campaignCreated"];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      systemInstruction,
      tools: [{ functionDeclarations: [createCampaignDeclaration] }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingMode.AUTO },
      },
    });

    const history: { role: "user" | "model"; parts: { text: string }[] }[] =
      [];
    for (const m of prior) {
      if (m.role === "user") {
        history.push({ role: "user", parts: [{ text: m.content }] });
      } else {
        history.push({ role: "model", parts: [{ text: m.content }] });
      }
    }

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(lastUser);

    for (let round = 0; round < 5; round++) {
      const calls = result.response.functionCalls();
      if (!calls?.length) {
        const text = result.response.text();
        return {
          content: text || "I’m sorry — I don’t have a response right now.",
          campaignCreated,
        };
      }

      const responseParts: Part[] = [];
      for (const call of calls) {
        if (call.name === "create_campaign") {
          const a = call.args as Record<string, unknown>;
          const title = String(a.title ?? "").trim();
          const goal_prompt = String(a.goal_prompt ?? "").trim();
          const mode =
            typeof a.mode === "string" && a.mode.trim()
              ? a.mode.trim()
              : undefined;
          if (!title || !goal_prompt) {
            responseParts.push({
              functionResponse: {
                name: call.name,
                response: {
                  ok: false,
                  error: "title and goal_prompt are required",
                },
              },
            });
          } else {
            const exec = await args.executeCreateCampaign({
              title,
              goal_prompt,
              mode,
            });
            if (exec.ok) {
              campaignCreated = {
                campaignId: exec.campaignId,
                dashboardUrl: exec.dashboardUrl,
              };
            }
            responseParts.push({
              functionResponse: {
                name: call.name,
                response: exec,
              },
            });
          }
        } else {
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: { ok: false, error: "Unknown tool" },
            },
          });
        }
      }

      result = await chat.sendMessage(responseParts);
    }

    return {
      content:
        result.response.text() || "Request took too many steps; try again.",
      campaignCreated,
    };
  });
}
