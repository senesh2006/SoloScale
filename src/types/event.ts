import {FormField, ContentType} from "@/types/campaign";
import { Timestamp } from "firebase/firestore";
import { Price } from "@/types/billing";

export type Event = {
  id?: string;
  campaign_id: string;
  slug: string;
  published: boolean;
  landing: TextStructure;
  location: string;
  form_fields: FormField[];
  price?: Price | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  sponsors: string[];
  sponsor_display: string;
  media: {hero_url?: string; gallery_url?: string};
};

export type TextStructure = {
  headline: string;
  subhead: string;
  body_md: string;
};

export type CalendarEntry = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  type: ContentType | "event";
  scheduled_at: string;
  title: string;
};