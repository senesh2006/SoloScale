import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
};

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
