import type { Timestamp } from "firebase/firestore";
import type { FormField, Landing } from "@/types/shared";

export type CampaignStatus =
  | "draft"
  | "strategy_ready"
  | "assets_ready"
  | "published";

export type CampaignMode = "all" | "strategy" | "flyer" | "voice";

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

/** Stored on `campaigns.flyer_input` when `mode = "flyer"`. */
export type CampaignFlyerInput = {
  visual_prompt: string;
  headline: string;
  subtext: string;
};

/** Stored on `campaigns.voice_input` when `mode = "voice"`. */
export type CampaignVoiceInput = {
  script: string;
  voice_id: string;
};

/** API input for generating a flyer asset. */
export type FlyerInput = {
  prompt: string;
  label?: string;
  headline?: string;
  subtext?: string;
};

/**
 * Prompts/settings used when regenerating assets via `soloscale-ai-service`.
 * Stored on `campaigns.ai_hero`.
 */
export type AiHeroMeta = {
  flyer?: FlyerInput;
  voiceScript?: string;
  voiceName?: string;
};

/** `campaigns/{campaignId}` — Firestore document fields. */
export type CampaignDocument = {
  user_id: string;
  title: string;
  goal_prompt: string;
  mode: CampaignMode;
  status: CampaignStatus;
  strategy_json: CampaignStrategy | null;
  /** Primary event id — first/active landing page for the campaign. */
  event_id: string | null;
  /** All event pages under this campaign (campaigns can host multiple). */
  event_ids?: string[];
  event_date: Timestamp | null;
  audience: string | null;
  flyer_input: CampaignFlyerInput | null;
  voice_input: CampaignVoiceInput | null;
  ai_hero?: AiHeroMeta;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/** API serialized campaign. */
export type Campaign = {
  id: string;
  user_id: string;
  title: string;
  goal_prompt: string;
  mode?: CampaignMode;
  status: CampaignStatus;
  strategy_json: CampaignStrategy | null;
  created_at: string;
  updated_at: string;
  event_id: string | null;
  event_ids?: string[];
  event_date?: string | null;
  audience?: string | null;
  flyer_input?: CampaignFlyerInput | null;
  voice_input?: CampaignVoiceInput | null;
  ai_hero?: AiHeroMeta;
};

export type VoiceoverInput = {
  script: string;
  voice_id?: string;
  label?: string;
};

/** Reminder/automation entries scheduled for an event. */
export type ReminderStatus = "scheduled" | "sent" | "cancelled";

export type ReminderPresetId = "7d" | "24h" | "1h" | "custom";

export type EventReminder = {
  id: string;
  event_id: string;
  preset_id: ReminderPresetId | null;
  label: string;
  scheduled_for: string;
  subject: string;
  body: string;
  status: ReminderStatus;
  enabled: boolean;
  channel?: "email" | "in_app";
  sent_at?: string | null;
};

export type CalendarEntry = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  type: ContentType | "event";
  scheduled_at: string;
  title: string;
};

export type { Landing as TextStructure };

// Re-exports — import from `@/types/campaign` or the specific module.
export type {
  Currency,
  EventPrice,
  FormField,
  FormFieldType,
  EventMedia,
  Landing,
  Sponsor,
  SponsorDisplay,
} from "@/types/shared";

export type {
  Event,
  EventDocument,
  EventWithId,
} from "@/types/event";

export type {
  Asset,
  AssetDocument,
  AssetKind,
  AssetStatus,
  AssetWithId,
} from "@/types/asset";

export type {
  Attendee,
  AttendeeDocument,
  AttendeeWithId,
} from "@/types/attendee";

export type {
  FormResponse,
  FormResponseAnswer,
  FormResponseDocument,
  FormResponseDocumentWithId,
  FormResponseInput,
  FormResponseValue,
} from "@/types/formResponse";

export type {
  Announcement,
  AnnouncementChannel,
  AnnouncementDocument,
  AnnouncementDocumentWithId,
} from "@/types/announcement";

export type { User, UserWithId } from "@/types/user";

export type {
  BillingHistoryItem,
  BillingPeriod,
  CardBrand,
  Invoice,
  InvoiceStatus,
  InvoiceWithId,
  Payment,
  PaymentMethod,
  PaymentMethodDocument,
  PaymentMethodDocumentWithId,
  PaymentStatus,
  PaymentWithId,
  Plan,
  PlanId,
  Price,
  Subscription,
  SubscriptionStatus,
  SubscriptionWithId,
} from "@/types/billing";
