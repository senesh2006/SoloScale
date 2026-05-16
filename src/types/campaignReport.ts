import type { EventAnalytics } from "@/lib/firestore/aggregateEventAnalytics";
import type { CampaignMode, CampaignStatus } from "@/types/campaign";

export type CampaignReportAssetItem = {
  id: string;
  kind: string;
  label: string | null;
  status: string;
  url: string | null;
};

export type CampaignReportEventItem = {
  id: string;
  title: string;
  status: string | null;
  slug: string | null;
  price_summary: string | null;
  announcement_count: number;
  payment_count: number;
  analytics: EventAnalytics;
};

export type CampaignReportStrategy = {
  summary: string;
  post_count: number;
  timeline_sample: Array<{
    type: string;
    scheduled_at: string;
    copy_preview: string;
  }>;
  event_draft_headline: string | null;
};

export type CampaignReportPacket = {
  generated_at: string;
  campaign: {
    id: string;
    title: string;
    goal_prompt: string;
    status: CampaignStatus;
    mode: CampaignMode | null;
    audience: string | null;
    event_date: string | null;
    created_at: string | null;
  };
  strategy: CampaignReportStrategy | null;
  assets: {
    total: number;
    by_kind: Record<string, number>;
    items: CampaignReportAssetItem[];
  };
  events: CampaignReportEventItem[];
  totals: {
    attendee_count: number;
    paid_count: number;
    free_count: number;
    revenue_cents: number;
    currency: string | null;
    event_count: number;
    asset_count: number;
    form_response_count: number;
    announcement_count: number;
    payment_count: number;
    registrations_by_day: { date: string; count: number }[];
  };
  metrics_for_ai: string;
};

export type CampaignReportNarrative = {
  executive_summary: string;
  campaign_overview: string;
  strategy_highlights: string;
  content_and_assets: string;
  performance_analysis: string;
  insights: string[];
  recommendations: string[];
  limitations_note: string;
};

export type ReportFormat = "md" | "html";
