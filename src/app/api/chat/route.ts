import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { hasGeminiApiKeys } from "@/services/ai/geminiKeys";
import {
  runGeminiAssistantTurn,
  type CreateCampaignToolResult,
} from "@/services/ai/geminiChat";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(12_000),
      }),
    )
    .min(1)
    .max(48),
});

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function loadCampaignContextBlock(
  userId: string,
): Promise<string> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.campaigns)
    .where("user_id", "==", userId)
    .limit(24)
    .get();

  const rows = snap.docs
    .map((d) => {
      const x = d.data();
      const title = String(x.title ?? "Untitled");
      const status = String(x.status ?? "?");
      const goal = truncate(String(x.goal_prompt ?? ""), 200);
      const hasStrategy = x.strategy_json != null ? "yes" : "no";
      const eventId = x.event_id ? String(x.event_id) : "none";
      return `- **${title}**  \`id=${d.id}\` · status=${status} · has_strategy=${hasStrategy} · event_id=${eventId}\n  Goal: ${goal || "(empty)"}`;
    })
    .sort((a, b) => a.localeCompare(b));

  if (rows.length === 0) {
    return "";
  }
  return rows.join("\n");
}

async function createCampaignFromChatRequest(
  request: Request,
  input: { title: string; goal_prompt: string; mode?: string },
): Promise<CreateCampaignToolResult> {
  const origin = new URL(request.url).origin;
  const auth = request.headers.get("authorization") ?? "";
  const mode = input.mode === "strategy" ? "strategy" : "all";

  const res = await fetch(`${origin}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    body: JSON.stringify({
      title: input.title,
      goal_prompt: input.goal_prompt,
      mode,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    campaign?: { id?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? `HTTP ${res.status}`,
    };
  }

  const id = data.campaign?.id;
  if (!id) {
    return { ok: false, error: "Campaign created but id missing in response" };
  }

  return {
    ok: true,
    campaignId: id,
    dashboardUrl: `/dashboard/campaigns/${id}`,
  };
}

/**
 * POST /api/chat
 * Gemini assistant with user's campaign context (no attendee data) and
 * optional create_campaign tool → POST /api/campaigns (same auth as caller).
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  if (!hasGeminiApiKeys()) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GEMINI_API_KEY or SS_AI_SERVICE_GEMINI_API_KEY (see .env.example).",
      },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const campaignContextBlock = await loadCampaignContextBlock(userId);
    const { content, campaignCreated } = await runGeminiAssistantTurn({
      messages: parsed.data.messages,
      campaignContextBlock,
      executeCreateCampaign: (input) =>
        createCampaignFromChatRequest(request, input),
    });
    return NextResponse.json({
      role: "assistant" as const,
      content,
      ...(campaignCreated ? { campaign_created: campaignCreated } : {}),
    });
  } catch (err) {
    console.error("chat error:", err);
    const message =
      err instanceof Error ? err.message : "Chat request failed";

    if (
      message ===
      "Ran out of API credits. Please try again later or check billing in Google AI Studio."
    ) {
      return NextResponse.json({ error: message }, { status: 502 });
    }

    let out = message;
    if (/API_KEY_INVALID|invalid api key|pass a valid api key/i.test(out)) {
      out +=
        " Add a valid key from https://aistudio.google.com/apikey as GEMINI_API_KEY or SS_AI_SERVICE_GEMINI_API_KEY (not your Firebase web API key).";
    }
    if (
      /ENOTFOUND|fetch failed|ECONNREFUSED|EAI_AGAIN|network|certificate/i.test(
        out,
      )
    ) {
      out +=
        " If this repeats for every key, the server cannot reach generativelanguage.googleapis.com (DNS, firewall, VPN, or offline).";
    }
    if (
      /HTTP\s+404\b/i.test(out) ||
      (/not found/i.test(out) && !/api\s*key/i.test(out))
    ) {
      out +=
        " Check GEMINI_TEXT_MODEL (e.g. gemini-2.0-flash or gemini-2.5-flash per AI Studio).";
    }
    if (/HTTP\s+429\b|resource exhausted|quota/i.test(out)) {
      out +=
        " Gemini quota exceeded — wait, add billing, or use another API key.";
    }
    return NextResponse.json({ error: out }, { status: 502 });
  }
}
