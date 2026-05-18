import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type {
  CampaignStrategy,
  FlyerInput,
  VoiceoverInput,
} from "@/types/campaign";
import { GEMINI_TEXT_MODEL } from "@/services/ai/geminiModel";
import {
  hasResolvedGeminiApiKey,
  resolveGeminiApiKey,
} from "@/lib/gemini-env";

function getGenAI(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(resolveGeminiApiKey());
}

export type StrategyAssetBrief = {
  flyer: FlyerInput;
  voice: VoiceoverInput;
};

const schema = {
  description: "A comprehensive marketing campaign strategy",
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "A high-level summary of the campaign strategy",
    },
    timeline: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          type: { 
            type: SchemaType.STRING,
            enum: ["tweet", "linkedin", "reel", "email"]
          },
          scheduled_at: { type: SchemaType.STRING, description: "ISO date string" },
          copy: { type: SchemaType.STRING },
        },
        required: ["id", "type", "scheduled_at", "copy"],
      },
    },
    event_draft: {
      type: SchemaType.OBJECT,
      properties: {
        headline: { type: SchemaType.STRING },
        subhead: { type: SchemaType.STRING },
        body_md: { type: SchemaType.STRING, description: "Markdown formatted body text" },
        form_fields: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING, enum: ["text", "email", "select"] },
              label: { type: SchemaType.STRING },
              required: { type: SchemaType.BOOLEAN },
            },
            required: ["id", "type", "label", "required"],
          },
        },
      },
      required: ["headline", "subhead", "body_md", "form_fields"],
    },
  },
  required: ["summary", "timeline", "event_draft"],
} as unknown as Schema;

export async function generateAssetsFromStrategy(input: {
  title: string;
  goal_prompt: string;
  strategy: CampaignStrategy;
}): Promise<StrategyAssetBrief> {
  if (!hasResolvedGeminiApiKey()) {
    return mockAssetsFromStrategy(input);
  }

  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          description: "Flyer and voiceover briefs aligned to an existing campaign strategy",
          type: SchemaType.OBJECT,
          properties: {
            flyer_prompt: {
              type: SchemaType.STRING,
              description: "Detailed visual prompt for image generation (style, colors, mood)",
            },
            flyer_headline: { type: SchemaType.STRING },
            flyer_subtext: { type: SchemaType.STRING },
            flyer_label: { type: SchemaType.STRING },
            voice_script: {
              type: SchemaType.STRING,
              description: "30-60 word voiceover script",
            },
            voice_label: { type: SchemaType.STRING },
          },
          required: [
            "flyer_prompt",
            "flyer_headline",
            "flyer_subtext",
            "flyer_label",
            "voice_script",
            "voice_label",
          ],
        } as any,
      },
    });

    const prompt = `
      Create matching flyer and voiceover briefs for a campaign that already has an approved strategy.

      Campaign: "${input.title}"
      Goal: "${input.goal_prompt}"

      Strategy summary: ${input.strategy.summary}

      Event landing:
      - Headline: ${input.strategy.event_draft.headline}
      - Subhead: ${input.strategy.event_draft.subhead}

      Content timeline:
      ${input.strategy.timeline
        .map(
          (t) =>
            `- ${t.type} (${t.scheduled_at}): ${t.copy}`,
        )
        .join("\n")}

      Return:
      - flyer_prompt: rich visual direction for a social promo graphic
      - flyer_headline / flyer_subtext: on-image copy (short)
      - flyer_label: short internal name e.g. "Launch week hero"
      - voice_script: 30-60 words, conversational, CTA at end
      - voice_label: short internal name e.g. "Strategy teaser"
    `;

    const result = await model.generateContent(prompt);
    const o = JSON.parse(result.response.text());
    return {
      flyer: {
        prompt: String(o.flyer_prompt ?? "").trim() || "Bold event promo graphic",
        headline: String(o.flyer_headline ?? "").trim() || undefined,
        subtext: String(o.flyer_subtext ?? "").trim() || undefined,
        label: String(o.flyer_label ?? "").trim() || "From strategy",
      },
      voice: {
        script: String(o.voice_script ?? "").trim() || "Join us — sign up at the link below.",
        label: String(o.voice_label ?? "").trim() || "From strategy",
      },
    };
  } catch (err) {
    console.error("Gemini strategy assets failed, falling back to mock:", err);
    return mockAssetsFromStrategy(input);
  }
}

function mockAssetsFromStrategy(input: {
  title: string;
  strategy: CampaignStrategy;
}): StrategyAssetBrief {
  const { event_draft, summary, timeline } = input.strategy;
  const hook = timeline[0]?.copy ?? summary;
  return {
    flyer: {
      prompt: `Promotional graphic for "${input.title}". ${summary} Visual style: modern, high-contrast, event photography feel. Key message: ${hook.slice(0, 120)}`,
      headline: event_draft.headline.slice(0, 60),
      subtext: event_draft.subhead.slice(0, 120),
      label: "Strategy hero flyer",
    },
    voice: {
      script: mockScript({
        title: input.title,
        goal_prompt: hook,
      }),
      label: "Strategy voiceover",
    },
  };
}

export async function refineCampaignStrategy(input: {
  current: CampaignStrategy;
  instruction: string;
  title: string;
  goal_prompt: string;
}): Promise<CampaignStrategy> {
  if (!hasResolvedGeminiApiKey()) {
    return mockRefine(input);
  }

  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `
      You are revising an existing marketing campaign strategy.
      Campaign title: "${input.title}".
      Original goal: "${input.goal_prompt}".

      Current strategy (JSON):
      ${JSON.stringify(input.current, null, 2)}

      The user wants the following change:
      "${input.instruction}"

      Apply the requested change and return the FULL updated strategy.
      Preserve everything the user did not ask to change. Keep the same
      shape and required fields. Keep existing timeline item IDs where you
      can; generate new IDs for any items you add.
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as CampaignStrategy;
  } catch (err) {
    console.error("Gemini strategy refine failed, falling back to mock:", err);
    return mockRefine(input);
  }
}

function mockRefine(input: {
  current: CampaignStrategy;
  instruction: string;
}): CampaignStrategy {
  const text = input.instruction.toLowerCase();
  const next: CampaignStrategy = JSON.parse(JSON.stringify(input.current));

  if (/(more casual|friendly|lighter|less formal)/.test(text)) {
    next.timeline = next.timeline.map((t) => ({
      ...t,
      copy: t.copy.replace(/\.\s/g, " — ").replace(/(?:^|\s)We\b/g, " we"),
    }));
    next.summary = `${next.summary} Tone leans more casual and conversational.`;
  } else if (/(more formal|professional|polished)/.test(text)) {
    next.summary = `${next.summary} Tone reads more polished and considered.`;
  } else if (/(shift|push|delay|move).*(week|7 days)/.test(text)) {
    const offset = /(\d+)\s*week/.test(text)
      ? Number(RegExp.$1) * 7
      : 7;
    next.timeline = next.timeline.map((t) => {
      const d = new Date(t.scheduled_at);
      d.setDate(d.getDate() + offset);
      return { ...t, scheduled_at: d.toISOString() };
    });
  } else if (/add.*(tweet|post|item)/.test(text)) {
    const lastDate = next.timeline.length
      ? new Date(next.timeline[next.timeline.length - 1].scheduled_at)
      : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    next.timeline.push({
      id: `item_${Math.random().toString(36).slice(2, 8)}`,
      type: "tweet",
      scheduled_at: lastDate.toISOString(),
      copy: `New post drafted from your instruction: "${input.instruction.slice(0, 80)}"`,
    });
  } else {
    next.summary = `${next.summary}\n\nRevision note: ${input.instruction}`;
  }

  return next;
}

export async function generateVoiceScript(input: {
  title: string;
  goal_prompt: string;
  hint?: string;
  strategy?: CampaignStrategy | null;
}): Promise<string> {
  if (!hasResolvedGeminiApiKey()) {
    return mockScript(input);
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const strategyBlock = input.strategy
      ? `
      Use this approved campaign strategy for tone and messaging:
      Summary: ${input.strategy.summary}
      Event headline: ${input.strategy.event_draft.headline}
      Event subhead: ${input.strategy.event_draft.subhead}
      Upcoming posts (sample): ${input.strategy.timeline
        .slice(0, 3)
        .map((t) => `[${t.type}] ${t.copy}`)
        .join(" | ")}
    `
      : "";

    const prompt = `
      Write a short, natural voiceover script for a promotional clip.
      Campaign title: "${input.title}".
      Goal: "${input.goal_prompt}".
      ${strategyBlock}
      ${input.hint ? `Use this as a starting point: "${input.hint}".` : ""}

      Constraints:
      - 30 to 60 words.
      - Warm, conversational, no hashtags or links.
      - End with a clear call to action ("Sign up at the link below" or similar).
      - Return ONLY the script text, no preamble or quotes.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini voice-script failed, falling back to mock:", err);
    return mockScript(input);
  }
}

function mockScript(input: { title: string; goal_prompt: string }): string {
  const title = input.title.trim() || "this event";
  const goal = input.goal_prompt.trim().split(/[.!?\n]/)[0].slice(0, 120);
  const variants = [
    `Hey — quick one. ${title} is happening soon, and if ${goal.toLowerCase()}, you're going to want to be there. Save your spot at the link below.`,
    `Picture this: ${goal}. That's exactly what ${title} is about. Join us — sign up at the link below.`,
    `If you've been waiting for the right moment, this is it. ${title} kicks off soon. Tap the link below to grab your seat.`,
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

export async function generateCampaignStrategy(input: {
  goal_prompt: string;
  title: string;
  /** Marketing window for scheduled posts (default 14). */
  horizonDays?: number;
}): Promise<CampaignStrategy> {
  if (!hasResolvedGeminiApiKey()) {
    throw new Error(
      "Gemini API key not configured (set GEMINI_API_KEY or SS_AI_SERVICE_GEMINI_API_KEY)",
    );
  }

  const days = Math.min(90, Math.max(1, input.horizonDays ?? 14));
  const postBand =
    days <= 7 ? "4-6" : days <= 14 ? "5-8" : days <= 30 ? "8-12" : "10-16";

  const model = getGenAI().getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const prompt = `
    You are an expert marketing strategist and copywriter.
    Your task is to create a cohesive marketing campaign strategy for a campaign titled "${input.title}".
    The user's goal is: "${input.goal_prompt}".

    The content timeline must span the next ${days} calendar days (from "today" forward when choosing scheduled_at timestamps).

    Generate:
    1. A high-level summary of the strategy.
    2. A timeline of ${postBand} specific content items (tweets, linkedin posts, reels, or emails) distributed across those ${days} days (use ISO 8601 strings for scheduled_at).
    3. A professional landing page draft for the main event associated with this campaign, including a headline, subhead, and markdown body text.
    4. A set of 2-3 custom form fields for the event registration that would be relevant to this specific audience.

    Ensure the copy is high-converting, professional, and tailored to the goal.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text()) as CampaignStrategy;
}
