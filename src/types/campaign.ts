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
  updated_at: string;
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
  label?: string;
  prompt?: string;
  voice_id?: string;
  created_at?: string;
};

export type FlyerInput = {
  prompt: string;
  label?: string;
  headline?: string;
  subtext?: string;
};

export type VoiceoverInput = {
  script: string;
  voice_id?: string;
  label?: string;
};

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "date"
  | "select"
  | "checkbox";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
};

export type Announcement = {
  id: string;
  event_id: string;
  subject: string;
  body: string;
  sent_at: string;
  recipient_count: number;
  channel?: "email" | "in_app";
};

export type Currency = "USD" | "EUR" | "GBP" | "INR" | "LKR";

export type EventPrice = {
  amount_cents: number;
  currency: Currency;
};

export type SponsorDisplay = "grid" | "carousel";

export type Sponsor = {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
};

export type EventMedia = {
  hero_url?: string;
  gallery_urls?: string[];
};

export type Event = {
  id: string;
  campaign_id: string;
  slug: string;
  published: boolean;
  landing: { headline: string; subhead: string; body_md: string };
  form_fields: FormField[];
  attendee_count: number;
  price?: EventPrice | null;
  media?: EventMedia;
  sponsors?: Sponsor[];
  sponsors_display?: SponsorDisplay;
  event_date?: string | null;
  location?: string | null;
};

export type Attendee = {
  id: string;
  event_id: string;
  email: string;
  name: string;
  created_at: string;
  ticket_code?: string;
  metadata?: Record<string, string>;
};

export type CalendarEntry = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  type: ContentType | "event";
  scheduled_at: string;
  title: string;
};
