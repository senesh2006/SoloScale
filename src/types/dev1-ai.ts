/** Shapes returned by soloscale-ai-service (Dev 1 contract). */

export type Dev1Platform = "twitter" | "linkedin" | "instagram" | "reel";

export type Dev1Post = {
  day: number;
  dateISO: string;
  platform: Dev1Platform;
  type: "text" | "image" | "reel";
  headline: string;
  body: string;
  hashtags: string[];
  cta?: string;
  suggestedFlyerPrompt?: string;
  suggestedVoiceoverScript?: string;
};

export type Dev1Event = {
  title: string;
  description: string;
  dateISO: string;
  format: "virtual" | "in-person" | "hybrid";
};

export type Dev1CampaignStrategy = {
  goal: string;
  durationDays: number;
  event?: Dev1Event;
  posts: Dev1Post[];
};

export type Dev1SavedAsset = {
  url: string;
  path: string;
  mimeType: string;
  durationMs?: number;
};

export type Dev1CampaignResponse = {
  strategy: Dev1CampaignStrategy;
  heroes: {
    flyerPostDay: number | null;
    voiceoverPostDay: number | null;
  };
  assets: {
    flyer: Dev1SavedAsset | null;
    flyerError?: string | null;
    voiceover: (Dev1SavedAsset & { durationMs?: number }) | null;
    voiceoverError?: string | null;
  };
};

export type VisionCampaignSeed = {
  campaignTitle: string;
  goal: string;
  audience: string;
  eventDate?: string;
  notes?: string;
};
