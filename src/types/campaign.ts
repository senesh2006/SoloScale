import { Timestamp } from "firebase/firestore";

export type CampaignStatus =
  | "draft"
  | "strategy_ready"
  | "assets_ready"
  | "published";

export type ContentType = "tweet" | "linkedin" | "reel" | "email";

export type ContentItem = {
  id: string;
  type: ContentType;
  scheduled_at: Timestamp;
  copy: string;
  asset_refs?: { flyer_id?: string; audio_id?: string };
};

export type EventDraft = {
  headline: string;
  subhead: string;
  body_md: string;
  form_fields: FormField[];
};

export type CampaignStrategy = {
  summary: string;
  timeline: ContentItem[];
  event_draft: EventDraft;
};

export type CampaignMode = "all" | "strategy" | "flyer" | "voice";

export type Campaign = {
  id: string;
  user_id: string;
  title: string;
  goal_prompt: string;
  status: CampaignStatus;
  mode: CampaignMode;
  strategy: CampaignStrategy | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  event_id: string | null;
  audience: string | null;
  voiceInput: VoiceInput | null;
  flyerInput: FlyerInput | null;
};

export type FlyerInput = {
  visual_prompt: string;
  headline: string;
  subtext: string;
  label: string;
};

export type VoiceInput = {
  script: string;
  voice_id: string;
};

export type FormFieldType = "text" | "email" | "select";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
};

