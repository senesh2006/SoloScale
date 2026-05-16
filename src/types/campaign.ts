export type CampaignStatus =
  | "draft"
  | "strategy_ready"
  | "assets_ready"
  | "published";

export type ContentType = "tweet" | "linkedin" | "reel" | "email";

export type ContentItem = {
  id: string;
  type: ContentType;
  scheduled_at: string;
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

export type Campaign = {
  id: string;
  user_id: string;
  title: string;
  goal_prompt: string;
  status: CampaignStatus;
  strategy_json: CampaignStrategy | null;
  created_at: string;
  event_id: string | null;
};

export type AssetKind = "flyer" | "voiceover";
export type AssetStatus = "pending" | "processing" | "ready" | "failed";

export type Asset = {
  id: string;
  campaign_id: string;
  kind: AssetKind;
  status: AssetStatus;
  url: string | null;
  thumbnail_url?: string;
};

export type FormFieldType = "text" | "email" | "select";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
};

export type Event = {
  id: string;
  campaign_id: string;
  slug: string;
  published: boolean;
  landing: { headline: string; subhead: string; body_md: string };
  form_fields: FormField[];
  attendee_count: number;
};

export type Attendee = {
  id: string;
  event_id: string;
  email: string;
  name: string;
  created_at: string;
};

export type CalendarEntry = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  type: ContentType | "event";
  scheduled_at: string;
  title: string;
};
