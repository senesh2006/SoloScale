import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { CampaignStrategy } from "@/types/campaign";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

export async function refineCampaignStrategy(input: {
  current: CampaignStrategy;
  instruction: string;
  title: string;
  goal_prompt: string;
}): Promise<CampaignStrategy> {
  if (!process.env.GEMINI_API_KEY) {
    return mockRefine(input);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return mockScript(input);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Write a short, natural voiceover script for a promotional clip.
      Campaign title: "${input.title}".
      Goal: "${input.goal_prompt}".
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
}): Promise<CampaignStrategy> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const prompt = `
    You are an expert marketing strategist and copywriter. 
    Your task is to create a cohesive 2-week marketing campaign strategy for a campaign titled "${input.title}".
    The user's goal is: "${input.goal_prompt}".

    Generate:
    1. A high-level summary of the strategy.
    2. A timeline of 4-6 specific content items (tweets, linkedin posts, reels, or emails) scheduled over the next 14 days.
    3. A professional landing page draft for the main event associated with this campaign, including a headline, subhead, and markdown body text.
    4. A set of 2-3 custom form fields for the event registration that would be relevant to this specific audience.

    Ensure the copy is high-converting, professional, and tailored to the goal.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text()) as CampaignStrategy;
}
